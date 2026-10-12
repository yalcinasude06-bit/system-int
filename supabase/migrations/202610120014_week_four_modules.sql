-- Week 4 Module 2 is deliberately scored out of 120; all existing modules
-- retain their 100-point cap. Draft retrieval also lets an interrupted Week 4
-- round reopen with the same deterministic card/question selection.

alter table public.module_drafts
  drop constraint if exists module_drafts_score_check;

alter table public.module_drafts
  add constraint module_drafts_score_check check (score between 0 and 120);

create or replace function public.module_score_cap(target_week_id int, target_module_id int)
returns int
language sql
immutable
as $$
  select case when target_week_id = 4 and target_module_id = 2 then 120 else 100 end;
$$;

create or replace function public.save_module_draft(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  target_stage int,
  new_payload jsonb,
  new_score int,
  new_answered_count int,
  new_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for share;

  if target_session.id is null or not target_session.is_active then
    raise exception 'Session is not active';
  end if;
  if not target_session.is_module_started
    or target_session.selected_week <> target_week_id
    or target_session.current_module <> target_module_id then
    return jsonb_build_object('saved', false, 'reason', 'module-closed');
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id;
  if target_student.id is null then raise exception 'Student does not belong to this session'; end if;

  if exists (
    select 1 from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and is_submitted = true
  ) then
    delete from public.module_drafts
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id;
    return jsonb_build_object('saved', false, 'reason', 'already-submitted');
  end if;

  insert into public.module_drafts (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, answered_count, revision, updated_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, greatest(coalesce(target_stage, 1), 1),
    coalesce(new_payload, '{}'::jsonb),
    greatest(0, least(coalesce(new_score, 0), public.module_score_cap(target_week_id, target_module_id))),
    greatest(0, coalesce(new_answered_count, 0)),
    greatest(0, coalesce(new_revision, 0)),
    timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id) do update
  set student_id = excluded.student_id,
      stage = excluded.stage,
      payload = excluded.payload,
      score = excluded.score,
      answered_count = excluded.answered_count,
      revision = excluded.revision,
      updated_at = excluded.updated_at
  where excluded.revision >= module_drafts.revision;

  return jsonb_build_object('saved', true);
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
  active_draft jsonb;
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
  select to_jsonb(draft) into active_draft
  from public.module_drafts draft
  where draft.session_id = target_session.id
    and draft.student_id = target_student.id
    and draft.week_id = target_session.selected_week
    and draft.module_id = target_session.current_module
  order by draft.updated_at desc
  limit 1;

  return jsonb_build_object(
    'session', to_jsonb(target_session) - 'teacher_username',
    'student', to_jsonb(target_student),
    'profile', case when target_profile.student_number is null then null else to_jsonb(target_profile) - 'teacher_username' end,
    'submissions', student_submissions,
    'classmates', classmates,
    'feedback_keys', feedback_keys,
    'draft', coalesce(active_draft, 'null'::jsonb)
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
  module_max_score int := public.module_score_cap(target_week_id, target_module_id);
  bounded_score int := greatest(0, least(coalesce(new_score, 0), module_max_score));
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
      calculated_bonus := round(time_bonus * greatest(0, least(bonus_row.score, module_max_score)) / module_max_score::numeric)::int;
      bonus_delta := calculated_bonus - bonus_row.speed_bonus;
      if bonus_delta <> 0 then
        update public.submissions set speed_bonus = calculated_bonus where id = bonus_row.id;
        update public.students set session_score = greatest(0, session_score + bonus_delta), score = greatest(0, score + bonus_delta) where id = bonus_row.student_id;
        update public.student_profiles set total_score = greatest(0, total_score + bonus_delta)
        where teacher_username = target_session.teacher_username and student_number = bonus_row.student_number;
      end if;
    end loop;
  end if;

  delete from public.module_drafts
  where session_id = target_session_id
    and student_number = target_student.student_number
    and week_id = target_week_id
    and module_id = target_module_id;

  select * into created_submission from public.submissions where id = created_submission.id;
  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

create or replace function public.finish_session_module(target_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  updated_session public.sessions%rowtype;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

  if target_session.id is null or not target_session.is_active then raise exception 'Session is not active'; end if;
  if not target_session.is_module_started then raise exception 'Module is not open'; end if;

  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
  )
  select draft.session_id,
         draft.student_id,
         draft.student_number,
         draft.week_id,
         draft.module_id,
         draft.stage,
         coalesce(draft.payload, '{}'::jsonb) || jsonb_build_object(
           'completionReason', 'teacher-ended',
           'answeredCount', draft.answered_count,
           'autoFinalized', true,
           'fromDraft', true
         ),
         greatest(0, least(draft.score, public.module_score_cap(draft.week_id, draft.module_id))),
         0,
         true,
         'incomplete',
         timezone('utc', now()),
         timezone('utc', now())
  from public.module_drafts draft
  where draft.session_id = target_session.id
    and draft.week_id = target_session.selected_week
    and draft.module_id = target_session.current_module
  on conflict (session_id, student_number, week_id, module_id) do nothing;

  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
  )
  select target_session.id,
         student.id,
         student.student_number,
         target_session.selected_week,
         target_session.current_module,
         greatest(target_session.module_stage, 1),
         jsonb_build_object(
           'completionReason', 'teacher-ended',
           'answeredCount', 0,
           'autoFinalized', true,
           'fromDraft', false
         ),
         0,
         0,
         true,
         'incomplete',
         timezone('utc', now()),
         timezone('utc', now())
  from public.students student
  where student.session_id = target_session.id
  on conflict (session_id, student_number, week_id, module_id) do nothing;

  update public.students student
  set session_score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        where answer.session_id = target_session.id
          and answer.student_number = student.student_number
          and answer.is_submitted = true
      ), 0),
      score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        where answer.session_id = target_session.id
          and answer.student_number = student.student_number
          and answer.is_submitted = true
      ), 0),
      last_active = timezone('utc', now())
  where student.session_id = target_session.id;

  update public.student_profiles profile
  set total_score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        join public.sessions answer_session on answer_session.id = answer.session_id
        where answer_session.teacher_username = target_session.teacher_username
          and answer.student_number = profile.student_number
          and answer.is_submitted = true
      ), 0),
      last_seen = timezone('utc', now())
  where profile.teacher_username = target_session.teacher_username
    and profile.student_number in (
      select student.student_number
      from public.students student
      where student.session_id = target_session.id
    );

  delete from public.module_drafts
  where session_id = target_session.id
    and week_id = target_session.selected_week
    and module_id = target_session.current_module;

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 3
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

revoke all on function public.module_score_cap(int, int) from public;
grant execute on function public.module_score_cap(int, int) to anon, authenticated;
revoke all on function public.save_module_draft(uuid, uuid, int, int, int, jsonb, int, int, bigint) from public;
grant execute on function public.save_module_draft(uuid, uuid, int, int, int, jsonb, int, int, bigint) to anon, authenticated;
revoke all on function public.get_student_game_state(text, uuid) from public;
grant execute on function public.get_student_game_state(text, uuid) to anon, authenticated;
revoke all on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) to anon, authenticated;
revoke all on function public.finish_session_module(uuid) from public;
revoke all on function public.finish_session_module(uuid) from anon, authenticated;
grant execute on function public.finish_session_module(uuid) to service_role;
