alter table public.submissions
  add column if not exists speed_bonus int not null default 0
  check (speed_bonus between 0 and 10);

comment on column public.submissions.speed_bonus is
  'Server-calculated 0–10 bonus based on submission order within a session/week/module.';

do $$
declare
  bonus_row record;
  calculated_bonus int;
begin
  for bonus_row in
    select ranked.id,
           ranked.student_id,
           ranked.student_number,
           ranked.position,
           ranked.group_size
    from (
      select submission.id,
             submission.student_id,
             submission.student_number,
             row_number() over (
               partition by submission.session_id, submission.week_id, submission.module_id
               order by submission.submitted_at, submission.id
             ) - 1 as position,
             count(*) over (
               partition by submission.session_id, submission.week_id, submission.module_id
             ) as group_size
      from public.submissions as submission
      where submission.is_submitted = true
    ) as ranked
  loop
    calculated_bonus := case
      when bonus_row.group_size = 1 then 10
      else round(
        10.0 * (bonus_row.group_size - 1 - bonus_row.position)
        / (bonus_row.group_size - 1)
      )::int
    end;

    update public.submissions
    set speed_bonus = calculated_bonus
    where id = bonus_row.id;

    update public.students
    set session_score = session_score + calculated_bonus,
        score = score + calculated_bonus
    where id = bonus_row.student_id;

    update public.student_profiles
    set total_score = total_score + calculated_bonus
    where student_number = bonus_row.student_number;
  end loop;
end;
$$;

create table if not exists public.module_feedback (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  student_number text not null,
  week_id int not null check (week_id > 0),
  module_id int not null check (module_id between 1 and 5),
  fun_rating int not null check (fun_rating between 1 and 5),
  difficulty_rating int not null check (difficulty_rating between 0 and 100),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, student_number, week_id, module_id)
);

create index if not exists module_feedback_session_module_idx
  on public.module_feedback(session_id, week_id, module_id);

alter table public.module_feedback enable row level security;

create or replace function public.submit_module_feedback(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  target_fun_rating int,
  target_difficulty_rating int,
  target_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student public.students%rowtype;
  normalized_comment text := nullif(btrim(coalesce(target_comment, '')), '');
  created_feedback public.module_feedback%rowtype;
begin
  if target_week_id < 1 or target_module_id not between 1 and 5 then
    raise exception 'Invalid module selection';
  end if;

  if target_fun_rating not between 1 and 5 then
    raise exception 'Fun rating must be between 1 and 5';
  end if;

  if target_difficulty_rating not between 0 and 100 then
    raise exception 'Difficulty rating must be between 0 and 100';
  end if;

  if normalized_comment is not null and char_length(normalized_comment) > 500 then
    raise exception 'Comment must contain at most 500 characters';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id
    and session_id = target_session_id;

  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  if not exists (
    select 1
    from public.submissions
    where session_id = target_session_id
      and student_id = target_student_id
      and week_id = target_week_id
      and module_id = target_module_id
      and is_submitted = true
  ) then
    raise exception 'Feedback requires a completed submission';
  end if;

  insert into public.module_feedback (
    session_id,
    student_id,
    student_number,
    week_id,
    module_id,
    fun_rating,
    difficulty_rating,
    comment
  ) values (
    target_session_id,
    target_student_id,
    target_student.student_number,
    target_week_id,
    target_module_id,
    target_fun_rating,
    target_difficulty_rating,
    normalized_comment
  )
  on conflict (session_id, student_number, week_id, module_id) do nothing
  returning * into created_feedback;

  return jsonb_build_object('was_new', created_feedback.id is not null);
end;
$$;

revoke all on function public.submit_module_feedback(uuid, uuid, int, int, int, int, text) from public;
grant execute on function public.submit_module_feedback(uuid, uuid, int, int, int, int, text)
  to anon, authenticated;

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
  group_size int;
  calculated_bonus int;
  bonus_delta int;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

  if target_session.id is null or not target_session.is_active then
    raise exception 'Session is not active';
  end if;

  if not target_session.is_module_started
    or target_session.selected_week <> target_week_id
    or target_session.current_module <> target_module_id then
    raise exception 'Module is not open for submissions';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id
  for update;

  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, speed_bonus, is_submitted, updated_at, submitted_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, greatest(target_stage, 1),
    coalesce(new_payload, '{}'::jsonb), bounded_score, 0, true,
    timezone('utc', now()), timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id) do nothing
  returning * into created_submission;

  if created_submission.id is null then
    select * into existing_submission
    from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id;

    return jsonb_build_object('submission', to_jsonb(existing_submission), 'was_new', false);
  end if;

  update public.students
  set session_score = session_score + bounded_score,
      score = score + bounded_score,
      last_active = timezone('utc', now())
  where id = target_student_id;

  insert into public.student_profiles (student_number, full_name, total_score, last_seen)
  values (target_student.student_number, target_student.nickname, bounded_score, timezone('utc', now()))
  on conflict (student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  select count(*)::int into group_size
  from public.submissions
  where session_id = target_session_id
    and week_id = target_week_id
    and module_id = target_module_id
    and is_submitted = true;

  for bonus_row in
    select submission.id,
           submission.student_id,
           submission.student_number,
           submission.speed_bonus,
           row_number() over (order by submission.submitted_at, submission.id) - 1 as position
    from public.submissions as submission
    where submission.session_id = target_session_id
      and submission.week_id = target_week_id
      and submission.module_id = target_module_id
      and submission.is_submitted = true
    order by submission.submitted_at, submission.id
  loop
    calculated_bonus := case
      when group_size = 1 then 10
      else round(10.0 * (group_size - 1 - bonus_row.position) / (group_size - 1))::int
    end;
    bonus_delta := calculated_bonus - bonus_row.speed_bonus;

    if bonus_delta <> 0 then
      update public.submissions
      set speed_bonus = calculated_bonus
      where id = bonus_row.id;

      update public.students
      set session_score = session_score + bonus_delta,
          score = score + bonus_delta
      where id = bonus_row.student_id;

      update public.student_profiles
      set total_score = total_score + bonus_delta
      where student_number = bonus_row.student_number;
    end if;
  end loop;

  select * into created_submission
  from public.submissions
  where id = created_submission.id;

  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

revoke all on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int)
  to anon, authenticated;

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
  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''));

  if target_session.id is null then
    raise exception 'Session was not found';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id
    and session_id = target_session.id;

  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  select * into target_profile
  from public.student_profiles
  where student_number = target_student.student_number;

  select coalesce(jsonb_agg(to_jsonb(answer) order by answer.submitted_at), '[]'::jsonb)
  into student_submissions
  from public.submissions answer
  where answer.session_id = target_session.id
    and answer.student_id = target_student.id;

  select coalesce(
    jsonb_agg(to_jsonb(classmate) order by classmate.session_score desc, classmate.joined_at),
    '[]'::jsonb
  )
  into classmates
  from public.students classmate
  where classmate.session_id = target_session.id;

  select coalesce(
    jsonb_agg(to_jsonb(format('%s:%s', feedback.week_id, feedback.module_id)) order by feedback.created_at),
    '[]'::jsonb
  )
  into feedback_keys
  from public.module_feedback feedback
  where feedback.session_id = target_session.id
    and feedback.student_id = target_student.id;

  return jsonb_build_object(
    'session', to_jsonb(target_session),
    'student', to_jsonb(target_student),
    'profile', case when target_profile.student_number is null then null else to_jsonb(target_profile) end,
    'submissions', student_submissions,
    'classmates', classmates,
    'feedback_keys', feedback_keys
  );
end;
$$;

revoke all on function public.get_student_game_state(text, uuid) from public;
grant execute on function public.get_student_game_state(text, uuid)
  to anon, authenticated;
