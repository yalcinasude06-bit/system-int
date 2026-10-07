-- Give every session and all-time profile an explicit teacher owner.
alter table public.sessions
  add column if not exists teacher_username text not null default 'admin';

create index if not exists sessions_teacher_username_created_at_idx
  on public.sessions(teacher_username, created_at desc);

alter table public.student_profiles
  add column if not exists teacher_username text not null default 'admin';

update public.student_profiles
set teacher_username = 'admin'
where teacher_username is null or btrim(teacher_username) = '';

alter table public.student_profiles
  drop constraint if exists student_profiles_pkey;

alter table public.student_profiles
  add primary key (teacher_username, student_number);

create index if not exists student_profiles_teacher_score_idx
  on public.student_profiles(teacher_username, total_score desc);

-- Classroom reads and all writes now go through the narrowly scoped RPCs/API.
drop policy if exists "public sessions access" on public.sessions;
drop policy if exists "public sessions read" on public.sessions;
drop policy if exists "public sessions create" on public.sessions;
drop policy if exists "public sessions update" on public.sessions;
drop policy if exists "public students access" on public.students;
drop policy if exists "public students read" on public.students;
drop policy if exists "public students create" on public.students;
drop policy if exists "public students update" on public.students;
drop policy if exists "public submissions access" on public.submissions;
drop policy if exists "public submissions read" on public.submissions;
drop policy if exists "public submissions create" on public.submissions;
drop policy if exists "public submissions update" on public.submissions;
drop policy if exists "public student profiles access" on public.student_profiles;
drop policy if exists "public student profiles read" on public.student_profiles;
drop policy if exists "public student profiles create" on public.student_profiles;
drop policy if exists "public student profiles update" on public.student_profiles;

revoke all on table public.sessions from anon, authenticated;
revoke all on table public.students from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.student_profiles from anon, authenticated;

create or replace function public.join_session_student(
  target_pin text,
  target_student_number text,
  target_full_name text,
  target_avatar text
)
returns public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_number text := btrim(coalesce(target_student_number, ''));
  normalized_name text := btrim(coalesce(target_full_name, ''));
  normalized_avatar text := btrim(coalesce(target_avatar, ''));
  target_session public.sessions%rowtype;
  joined_student public.students%rowtype;
begin
  if char_length(normalized_number) < 2 or char_length(normalized_number) > 30 then
    raise exception 'Student number must contain between 2 and 30 characters';
  end if;
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 50 then
    raise exception 'Student name must contain between 2 and 50 characters';
  end if;
  if char_length(normalized_avatar) < 1 or char_length(normalized_avatar) > 20 then
    normalized_avatar := '🎓';
  end if;

  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, '')) and is_active = true
  for update;
  if target_session.id is null then raise exception 'Session is not active'; end if;

  insert into public.students (session_id, student_number, nickname, avatar, last_active)
  values (target_session.id, normalized_number, normalized_name, normalized_avatar, timezone('utc', now()))
  on conflict (session_id, student_number) do update
  set nickname = excluded.nickname, avatar = excluded.avatar, last_active = excluded.last_active
  returning * into joined_student;

  insert into public.student_profiles (teacher_username, student_number, full_name, last_seen)
  values (target_session.teacher_username, normalized_number, normalized_name, timezone('utc', now()))
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name, last_seen = excluded.last_seen;

  return joined_student;
end;
$$;

create or replace function public.get_student_game_state(
  target_pin text,
  target_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
  target_profile public.student_profiles%rowtype;
  student_submissions jsonb;
  classmates jsonb;
  feedback_keys jsonb;
begin
  select * into target_session from public.sessions where pin_code = btrim(coalesce(target_pin, ''));
  if target_session.id is null then raise exception 'Session was not found'; end if;
  select * into target_student from public.students where id = target_student_id and session_id = target_session.id;
  if target_student.id is null then raise exception 'Student does not belong to this session'; end if;

  select * into target_profile from public.student_profiles
  where teacher_username = target_session.teacher_username and student_number = target_student.student_number;
  select coalesce(jsonb_agg(to_jsonb(answer) order by answer.submitted_at), '[]'::jsonb)
  into student_submissions from public.submissions answer
  where answer.session_id = target_session.id and answer.student_id = target_student.id;
  select coalesce(jsonb_agg(to_jsonb(classmate) order by classmate.session_score desc, classmate.joined_at), '[]'::jsonb)
  into classmates from public.students classmate where classmate.session_id = target_session.id;
  select coalesce(jsonb_agg(to_jsonb(format('%s:%s', feedback.week_id, feedback.module_id)) order by feedback.created_at), '[]'::jsonb)
  into feedback_keys from public.module_feedback feedback
  where feedback.session_id = target_session.id and feedback.student_id = target_student.id;

  return jsonb_build_object(
    'session', to_jsonb(target_session) - 'teacher_username',
    'student', to_jsonb(target_student),
    'profile', case when target_profile.student_number is null then null else to_jsonb(target_profile) - 'teacher_username' end,
    'submissions', student_submissions,
    'classmates', classmates,
    'feedback_keys', feedback_keys
  );
end;
$$;

create or replace function public.submit_module_once(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  target_stage int,
  new_payload jsonb,
  new_score int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
  created_submission public.submissions%rowtype;
  existing_submission public.submissions%rowtype;
  bonus_row record;
  bounded_score int := greatest(0, least(coalesce(new_score, 0), 100));
  submission_status text := case when coalesce(new_payload, '{}'::jsonb) ->> 'completionReason' = 'teacher-ended' then 'incomplete' else 'completed' end;
  group_size int;
  time_bonus int;
  calculated_bonus int;
  bonus_delta int;
begin
  select * into target_session from public.sessions where id = target_session_id for update;
  if target_session.id is null or not target_session.is_active then raise exception 'Session is not active'; end if;
  if not target_session.is_module_started or target_session.selected_week <> target_week_id or target_session.current_module <> target_module_id then
    raise exception 'Module is not open for submissions';
  end if;
  select * into target_student from public.students where id = target_student_id and session_id = target_session_id for update;
  if target_student.id is null then raise exception 'Student does not belong to this session'; end if;

  insert into public.submissions (session_id, student_id, student_number, week_id, module_id, stage, payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at)
  values (target_session_id, target_student_id, target_student.student_number, target_week_id, target_module_id, greatest(target_stage, 1), coalesce(new_payload, '{}'::jsonb), bounded_score, 0, true, submission_status, timezone('utc', now()), timezone('utc', now()))
  on conflict (session_id, student_number, week_id, module_id) do nothing
  returning * into created_submission;

  if created_submission.id is null then
    select * into existing_submission from public.submissions
    where session_id = target_session_id and student_number = target_student.student_number and week_id = target_week_id and module_id = target_module_id;
    return jsonb_build_object('submission', to_jsonb(existing_submission), 'was_new', false);
  end if;

  update public.students set session_score = session_score + bounded_score, score = score + bounded_score, last_active = timezone('utc', now()) where id = target_student_id;
  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  values (target_session.teacher_username, target_student.student_number, target_student.nickname, bounded_score, timezone('utc', now()))
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name, total_score = public.student_profiles.total_score + excluded.total_score, last_seen = excluded.last_seen;

  if submission_status = 'completed' then
    select count(*)::int into group_size from public.submissions
    where session_id = target_session_id and week_id = target_week_id and module_id = target_module_id and is_submitted = true and completion_status = 'completed';
    for bonus_row in
      select submission.id, submission.student_id, submission.student_number, submission.score, submission.speed_bonus,
             row_number() over (order by submission.submitted_at, submission.id) - 1 as position
      from public.submissions submission
      where submission.session_id = target_session_id and submission.week_id = target_week_id and submission.module_id = target_module_id
        and submission.is_submitted = true and submission.completion_status = 'completed'
      order by submission.submitted_at, submission.id
    loop
      time_bonus := case when group_size = 1 then 10 else round(10.0 * (group_size - 1 - bonus_row.position) / (group_size - 1))::int end;
      calculated_bonus := round(time_bonus * greatest(0, least(bonus_row.score, 100)) / 100.0)::int;
      bonus_delta := calculated_bonus - bonus_row.speed_bonus;
      if bonus_delta <> 0 then
        update public.submissions set speed_bonus = calculated_bonus where id = bonus_row.id;
        update public.students set session_score = greatest(0, session_score + bonus_delta), score = greatest(0, score + bonus_delta) where id = bonus_row.student_id;
        update public.student_profiles set total_score = greatest(0, total_score + bonus_delta)
        where teacher_username = target_session.teacher_username and student_number = bonus_row.student_number;
      end if;
    end loop;
  end if;

  select * into created_submission from public.submissions where id = created_submission.id;
  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

create or replace function public.start_session_module(target_session_id uuid, target_module_id int)
returns public.sessions language plpgsql security definer set search_path = public as $$
declare updated_session public.sessions%rowtype;
begin
  update public.sessions set current_module = target_module_id, module_stage = 2, is_module_started = true,
    module_started_at = clock_timestamp(), fault_injected = false
  where id = target_session_id and is_active = true returning * into updated_session;
  if updated_session.id is null then raise exception 'Active session not found'; end if;
  return updated_session;
end;
$$;

create or replace function public.cancel_session_module_start(target_session_id uuid)
returns public.sessions language plpgsql security definer set search_path = public as $$
declare updated_session public.sessions%rowtype;
begin
  update public.sessions set is_module_started = false, module_started_at = null, module_stage = 1, fault_injected = false
  where id = target_session_id and is_active = true and is_module_started = true and module_started_at is not null
    and module_started_at + interval '10 seconds' > clock_timestamp()
  returning * into updated_session;
  if updated_session.id is null then raise exception 'Countdown is no longer active'; end if;
  return updated_session;
end;
$$;

revoke all on function public.join_session_student(text, text, text, text) from public;
grant execute on function public.join_session_student(text, text, text, text) to anon, authenticated;
revoke all on function public.get_student_game_state(text, uuid) from public;
grant execute on function public.get_student_game_state(text, uuid) to anon, authenticated;
revoke all on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) to anon, authenticated;
revoke all on function public.start_session_module(uuid, int) from public;
revoke all on function public.start_session_module(uuid, int) from anon, authenticated;
grant execute on function public.start_session_module(uuid, int) to service_role;
revoke all on function public.cancel_session_module_start(uuid) from public;
revoke all on function public.cancel_session_module_start(uuid) from anon, authenticated;
grant execute on function public.cancel_session_module_start(uuid) to service_role;
revoke all on function public.finish_session_module(uuid) from public;
revoke all on function public.finish_session_module(uuid) from anon, authenticated;
grant execute on function public.finish_session_module(uuid) to service_role;
