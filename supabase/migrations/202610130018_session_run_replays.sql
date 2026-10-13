-- Replayable module rounds without a separate run table. Every successful
-- teacher start consumes one monotonically increasing session-wide number.
-- Finish any still-open legacy round through its existing atomic RPC first,
-- preserving drafts as teacher-ended results before the signatures change.

do $$
declare
  active_session record;
begin
  for active_session in
    select id
    from public.sessions
    where is_active = true and is_module_started = true
    order by id
    for update
  loop
    perform public.finish_session_module(active_session.id);
  end loop;
end;
$$;

alter table public.sessions
  add column if not exists current_run_number bigint not null default 0
  check (current_run_number >= 0);

alter table public.submissions
  add column if not exists run_number bigint not null default 0
  check (run_number >= 0);

alter table public.module_drafts
  add column if not exists run_number bigint not null default 0
  check (run_number >= 0);

alter table public.module_feedback
  add column if not exists run_number bigint not null default 0
  check (run_number >= 0);

-- Build replacement uniqueness before removing the legacy keys.
create unique index if not exists submissions_one_attempt_run_idx
  on public.submissions(session_id, student_number, week_id, module_id, run_number);

drop index if exists public.submissions_one_attempt_key;
alter index public.submissions_one_attempt_run_idx rename to submissions_one_attempt_key;

create unique index if not exists module_drafts_one_active_run_idx
  on public.module_drafts(session_id, student_number, week_id, module_id, run_number);

alter table public.module_drafts drop constraint if exists module_drafts_pkey;
alter table public.module_drafts
  add constraint module_drafts_pkey primary key using index module_drafts_one_active_run_idx;

create unique index if not exists module_feedback_one_per_run_idx
  on public.module_feedback(session_id, student_number, week_id, module_id, run_number);

do $$
declare
  legacy_constraint text;
begin
  select constraint_row.conname
  into legacy_constraint
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.module_feedback'::regclass
    and constraint_row.contype = 'u'
    and pg_get_constraintdef(constraint_row.oid) = 'UNIQUE (session_id, student_number, week_id, module_id)'
  limit 1;

  if legacy_constraint is not null then
    execute format('alter table public.module_feedback drop constraint %I', legacy_constraint);
  end if;
end;
$$;

alter table public.module_feedback
  add constraint module_feedback_one_per_run_key unique using index module_feedback_one_per_run_idx;

drop index if exists public.submissions_session_module_idx;
create index submissions_session_module_idx
  on public.submissions(session_id, week_id, module_id, run_number, is_submitted);

drop index if exists public.submissions_student_week_idx;
create index submissions_student_week_idx
  on public.submissions(student_number, week_id, module_id, run_number);

drop index if exists public.module_drafts_student_idx;
create index module_drafts_student_idx
  on public.module_drafts(student_id, week_id, module_id, run_number);

drop index if exists public.module_feedback_session_module_idx;
create index module_feedback_session_module_idx
  on public.module_feedback(session_id, week_id, module_id, run_number);

comment on column public.sessions.current_run_number is
  'Session-wide monotonically increasing round number. Zero identifies pre-migration legacy data.';
comment on column public.submissions.run_number is
  'Server-validated session round number; zero identifies pre-migration legacy data.';

-- New Factory Transformation rounds contain five decisions. Existing 90-point
-- submissions remain untouched and continue contributing their stored score.
create or replace function public.module_score_cap(target_week_id int, target_module_id int)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when target_week_id = 4 and target_module_id = 1 then 50
    when target_week_id = 4 and target_module_id = 3 then 80
    else 100
  end;
$$;

create or replace function public.start_session_module(target_session_id uuid, target_module_id int)
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

  if target_session.id is null or not target_session.is_active then
    raise exception 'Active session not found';
  end if;
  if target_session.is_module_started then
    raise exception 'A module round is already active';
  end if;
  if target_module_id < 1
    or (target_session.selected_week = 1 and target_module_id > 5)
    or (target_session.selected_week in (3, 4) and target_module_id > 3)
    or (target_session.selected_week not in (1, 3, 4)) then
    raise exception 'Invalid module selection';
  end if;

  update public.sessions
  set current_run_number = current_run_number + 1,
      current_module = target_module_id,
      module_stage = 2,
      is_module_started = true,
      module_started_at = clock_timestamp(),
      fault_injected = false
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

create or replace function public.cancel_session_module_start(
  target_session_id uuid,
  expected_run_number bigint
)
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

  if target_session.id is null or not target_session.is_active then
    raise exception 'Active session not found';
  end if;
  if target_session.current_run_number <> expected_run_number then
    raise exception 'Stale module round';
  end if;
  if not target_session.is_module_started
    or target_session.module_started_at is null
    or target_session.module_started_at + interval '10 seconds' <= clock_timestamp() then
    raise exception 'Countdown is no longer active';
  end if;

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 1,
      fault_injected = false
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

create or replace function public.save_module_draft(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  expected_run_number bigint,
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
    or target_session.current_module <> target_module_id
    or target_session.current_run_number <> expected_run_number then
    return jsonb_build_object('saved', false, 'reason', 'module-closed-or-stale');
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  if exists (
    select 1 from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number
      and is_submitted = true
  ) then
    delete from public.module_drafts
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number;
    return jsonb_build_object('saved', false, 'reason', 'already-submitted');
  end if;

  insert into public.module_drafts (
    session_id, student_id, student_number, week_id, module_id, run_number,
    stage, payload, score, answered_count, revision, updated_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, expected_run_number,
    greatest(coalesce(target_stage, 1), 1), coalesce(new_payload, '{}'::jsonb),
    greatest(0, least(coalesce(new_score, 0), public.module_score_cap(target_week_id, target_module_id))),
    greatest(0, coalesce(new_answered_count, 0)), greatest(0, coalesce(new_revision, 0)),
    timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id, run_number) do update
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

create or replace function public.submit_module_once(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  expected_run_number bigint,
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
  module_max_score int := public.module_score_cap(target_week_id, target_module_id);
  bounded_score int := greatest(0, least(coalesce(new_score, 0), module_max_score));
  submission_status text := case
    when coalesce(new_payload, '{}'::jsonb) ->> 'completionReason' = 'teacher-ended' then 'incomplete'
    else 'completed'
  end;
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
    or target_session.current_module <> target_module_id
    or target_session.current_run_number <> expected_run_number then
    raise exception 'Module is not open for this run';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id
  for update;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, run_number,
    stage, payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, expected_run_number,
    greatest(coalesce(target_stage, 1), 1), coalesce(new_payload, '{}'::jsonb),
    bounded_score, 0, true, submission_status, timezone('utc', now()), timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id, run_number) do nothing
  returning * into created_submission;

  if created_submission.id is null then
    select * into existing_submission
    from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number;
    return jsonb_build_object('submission', to_jsonb(existing_submission), 'was_new', false);
  end if;

  update public.students
  set session_score = session_score + bounded_score,
      score = score + bounded_score,
      last_active = timezone('utc', now())
  where id = target_student_id;

  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  values (
    target_session.teacher_username,
    target_student.student_number,
    target_student.nickname,
    bounded_score,
    timezone('utc', now())
  )
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  delete from public.module_drafts
  where session_id = target_session_id
    and student_number = target_student.student_number
    and week_id = target_week_id
    and module_id = target_module_id
    and run_number = expected_run_number;

  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

create or replace function public.finish_session_module(
  target_session_id uuid,
  expected_run_number bigint
)
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

  if target_session.id is null or not target_session.is_active then
    raise exception 'Session is not active';
  end if;
  if target_session.current_run_number <> expected_run_number then
    raise exception 'Stale module round';
  end if;
  if not target_session.is_module_started then
    if target_session.module_stage >= 3 then
      return target_session;
    end if;
    raise exception 'Module is not open';
  end if;

  -- Insert exactly one current-run result per student, preferring any saved
  -- partial draft. Only rows actually inserted here contribute new base score.
  with candidates as (
    select draft.session_id,
           draft.student_id,
           draft.student_number,
           draft.week_id,
           draft.module_id,
           draft.run_number,
           draft.stage,
           coalesce(draft.payload, '{}'::jsonb) || jsonb_build_object(
             'completionReason', 'teacher-ended',
             'answeredCount', draft.answered_count,
             'autoFinalized', true,
             'fromDraft', true
           ) as payload,
           greatest(0, least(draft.score, public.module_score_cap(draft.week_id, draft.module_id))) as score
    from public.module_drafts draft
    where draft.session_id = target_session.id
      and draft.week_id = target_session.selected_week
      and draft.module_id = target_session.current_module
      and draft.run_number = target_session.current_run_number

    union all

    select target_session.id,
           student.id,
           student.student_number,
           target_session.selected_week,
           target_session.current_module,
           target_session.current_run_number,
           greatest(target_session.module_stage, 1),
           jsonb_build_object(
             'completionReason', 'teacher-ended',
             'answeredCount', 0,
             'autoFinalized', true,
             'fromDraft', false
           ),
           0
    from public.students student
    where student.session_id = target_session.id
      and not exists (
        select 1 from public.module_drafts draft
        where draft.session_id = target_session.id
          and draft.student_number = student.student_number
          and draft.week_id = target_session.selected_week
          and draft.module_id = target_session.current_module
          and draft.run_number = target_session.current_run_number
      )
  ), inserted as (
    insert into public.submissions (
      session_id, student_id, student_number, week_id, module_id, run_number,
      stage, payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
    )
    select candidate.session_id,
           candidate.student_id,
           candidate.student_number,
           candidate.week_id,
           candidate.module_id,
           candidate.run_number,
           candidate.stage,
           candidate.payload,
           candidate.score,
           0,
           true,
           'incomplete',
           timezone('utc', now()),
           timezone('utc', now())
    from candidates candidate
    on conflict (session_id, student_number, week_id, module_id, run_number) do nothing
    returning student_id, student_number, score
  ), score_totals as (
    select student_id, student_number, sum(score)::int as score_delta
    from inserted
    group by student_id, student_number
  ), updated_students as (
    update public.students student
    set session_score = student.session_score + total.score_delta,
        score = student.score + total.score_delta,
        last_active = timezone('utc', now())
    from score_totals total
    where student.id = total.student_id
    returning student.id
  )
  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  select target_session.teacher_username,
         total.student_number,
         student.nickname,
         total.score_delta,
         timezone('utc', now())
  from score_totals total
  join public.students student on student.id = total.student_id
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  -- Finalize the accuracy-weighted speed bonus once, in one set-based pass,
  -- and apply only the resulting deltas to cumulative totals.
  with ranked as (
    select submission.id,
           submission.student_id,
           submission.student_number,
           submission.score,
           submission.speed_bonus,
           row_number() over (order by submission.submitted_at, submission.id) - 1 as position,
           count(*) over () as group_size
    from public.submissions submission
    where submission.session_id = target_session.id
      and submission.week_id = target_session.selected_week
      and submission.module_id = target_session.current_module
      and submission.run_number = target_session.current_run_number
      and submission.is_submitted = true
      and submission.completion_status = 'completed'
  ), calculated as (
    select ranked.*,
           round(
             (case
               when ranked.group_size = 1 then 10
               else round(
                 10.0 * (ranked.group_size - 1 - ranked.position)
                 / (ranked.group_size - 1)
               )::int
             end)
             * greatest(0, least(ranked.score, public.module_score_cap(target_session.selected_week, target_session.current_module)))
             / public.module_score_cap(target_session.selected_week, target_session.current_module)::numeric
           )::int as calculated_bonus
    from ranked
  ), changed as (
    update public.submissions submission
    set speed_bonus = calculated.calculated_bonus
    from calculated
    where submission.id = calculated.id
      and submission.speed_bonus is distinct from calculated.calculated_bonus
    returning submission.student_id,
              submission.student_number,
              calculated.calculated_bonus - calculated.speed_bonus as bonus_delta
  ), bonus_totals as (
    select student_id, student_number, sum(bonus_delta)::int as bonus_delta
    from changed
    group by student_id, student_number
  ), updated_students as (
    update public.students student
    set session_score = greatest(0, student.session_score + total.bonus_delta),
        score = greatest(0, student.score + total.bonus_delta),
        last_active = timezone('utc', now())
    from bonus_totals total
    where student.id = total.student_id
    returning student.id
  )
  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  select target_session.teacher_username,
         total.student_number,
         student.nickname,
         total.bonus_delta,
         timezone('utc', now())
  from bonus_totals total
  join public.students student on student.id = total.student_id
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = greatest(0, public.student_profiles.total_score + excluded.total_score),
      last_seen = excluded.last_seen;

  delete from public.module_drafts
  where session_id = target_session.id
    and week_id = target_session.selected_week
    and module_id = target_session.current_module
    and run_number = target_session.current_run_number;

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 3
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

create or replace function public.submit_module_feedback(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  expected_run_number bigint,
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
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
  normalized_comment text := nullif(btrim(coalesce(target_comment, '')), '');
  created_feedback public.module_feedback%rowtype;
begin
  if target_week_id < 1 or target_module_id not between 1 and 5 or expected_run_number < 0 then
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

  select * into target_session from public.sessions where id = target_session_id;
  if target_session.id is null then raise exception 'Session was not found'; end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  if not exists (
    select 1 from public.submissions
    where session_id = target_session_id
      and student_id = target_student_id
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number
      and is_submitted = true
  ) then
    raise exception 'Feedback requires a saved submission for this run';
  end if;

  insert into public.module_feedback (
    session_id, student_id, student_number, week_id, module_id, run_number,
    fun_rating, difficulty_rating, comment
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, expected_run_number,
    target_fun_rating, target_difficulty_rating, normalized_comment
  )
  on conflict (session_id, student_number, week_id, module_id, run_number) do nothing
  returning * into created_feedback;

  return jsonb_build_object('was_new', created_feedback.id is not null);
end;
$$;

create or replace function public.get_student_session_status(
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
begin
  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''));
  if target_session.id is null then raise exception 'Session was not found'; end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session.id;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', target_session.id,
      'pin_code', target_session.pin_code,
      'title', target_session.title,
      'selected_week', target_session.selected_week,
      'current_module', target_session.current_module,
      'current_run_number', target_session.current_run_number,
      'module_stage', target_session.module_stage,
      'is_module_started', target_session.is_module_started,
      'module_started_at', target_session.module_started_at,
      'is_active', target_session.is_active,
      'fault_injected', target_session.fault_injected,
      'created_at', target_session.created_at
    ),
    'student', jsonb_build_object(
      'id', target_student.id,
      'score', target_student.score,
      'session_score', target_student.session_score,
      'last_active', target_student.last_active
    )
  );
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
  current_submission jsonb;
  classmates jsonb;
  feedback_keys jsonb;
  active_draft jsonb;
begin
  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''));
  if target_session.id is null then raise exception 'Session was not found'; end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session.id;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  select * into target_profile
  from public.student_profiles
  where teacher_username = target_session.teacher_username
    and student_number = target_student.student_number;

  select to_jsonb(submission) into current_submission
  from public.submissions submission
  where submission.session_id = target_session.id
    and submission.student_id = target_student.id
    and submission.week_id = target_session.selected_week
    and submission.module_id = target_session.current_module
    and submission.run_number = target_session.current_run_number
  limit 1;

  select coalesce(jsonb_agg(to_jsonb(classmate) order by classmate.session_score desc, classmate.joined_at), '[]'::jsonb)
  into classmates
  from public.students classmate
  where classmate.session_id = target_session.id;

  select coalesce(
    jsonb_agg(to_jsonb(format('%s:%s:%s', feedback.week_id, feedback.module_id, feedback.run_number))),
    '[]'::jsonb
  ) into feedback_keys
  from public.module_feedback feedback
  where feedback.session_id = target_session.id
    and feedback.student_id = target_student.id
    and feedback.week_id = target_session.selected_week
    and feedback.module_id = target_session.current_module
    and feedback.run_number = target_session.current_run_number;

  select to_jsonb(draft) into active_draft
  from public.module_drafts draft
  where draft.session_id = target_session.id
    and draft.student_id = target_student.id
    and draft.week_id = target_session.selected_week
    and draft.module_id = target_session.current_module
    and draft.run_number = target_session.current_run_number
  limit 1;

  return jsonb_build_object(
    'session', to_jsonb(target_session) - 'teacher_username',
    'student', to_jsonb(target_student),
    'profile', case
      when target_profile.student_number is null then null
      else to_jsonb(target_profile) - 'teacher_username'
    end,
    'submissions', case
      when current_submission is null then '[]'::jsonb
      else jsonb_build_array(current_submission)
    end,
    'classmates', classmates,
    'feedback_keys', feedback_keys,
    'draft', coalesce(active_draft, 'null'::jsonb)
  );
end;
$$;

-- Controlled repair tool; never called from polling or submission paths.
create or replace function public.reconcile_session_scores(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;
  if target_session.id is null then raise exception 'Session was not found'; end if;

  update public.students student
  set session_score = coalesce(total.total_score, 0),
      score = coalesce(total.total_score, 0),
      last_active = timezone('utc', now())
  from (
    select participant.id as student_id,
           sum(coalesce(submission.score, 0) + coalesce(submission.speed_bonus, 0))::int as total_score
    from public.students participant
    left join public.submissions submission
      on submission.session_id = participant.session_id
      and submission.student_number = participant.student_number
      and submission.is_submitted = true
    where participant.session_id = target_session_id
    group by participant.id
  ) total
  where student.id = total.student_id;

  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  select target_session.teacher_username,
         submission.student_number,
         max(student.nickname),
         sum(submission.score + submission.speed_bonus)::int,
         timezone('utc', now())
  from public.submissions submission
  join public.sessions answer_session on answer_session.id = submission.session_id
  join public.students student
    on student.session_id = target_session_id
    and student.student_number = submission.student_number
  where answer_session.teacher_username = target_session.teacher_username
    and submission.is_submitted = true
  group by submission.student_number
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = excluded.total_score,
      last_seen = excluded.last_seen;
end;
$$;

-- Remove legacy callable signatures so no request can bypass run validation.
drop function if exists public.submit_module_once(uuid, uuid, int, int, int, jsonb, int);
drop function if exists public.save_module_draft(uuid, uuid, int, int, int, jsonb, int, int, bigint);
drop function if exists public.submit_module_feedback(uuid, uuid, int, int, int, int, text);
drop function if exists public.cancel_session_module_start(uuid);
drop function if exists public.finish_session_module(uuid);

revoke all on function public.module_score_cap(int, int) from public;
grant execute on function public.module_score_cap(int, int) to anon, authenticated;

revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
grant execute on function public.start_session_module(uuid, int) to service_role;

revoke all on function public.cancel_session_module_start(uuid, bigint) from public, anon, authenticated;
grant execute on function public.cancel_session_module_start(uuid, bigint) to service_role;

revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;

revoke all on function public.reconcile_session_scores(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_session_scores(uuid) to service_role;

revoke all on function public.submit_module_once(uuid, uuid, int, int, bigint, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, bigint, int, jsonb, int) to anon, authenticated;

revoke all on function public.save_module_draft(uuid, uuid, int, int, bigint, int, jsonb, int, int, bigint) from public;
grant execute on function public.save_module_draft(uuid, uuid, int, int, bigint, int, jsonb, int, int, bigint) to anon, authenticated;

revoke all on function public.submit_module_feedback(uuid, uuid, int, int, bigint, int, int, text) from public;
grant execute on function public.submit_module_feedback(uuid, uuid, int, int, bigint, int, int, text) to anon, authenticated;

revoke all on function public.get_student_session_status(text, uuid) from public;
grant execute on function public.get_student_session_status(text, uuid) to anon, authenticated;

revoke all on function public.get_student_game_state(text, uuid) from public;
grant execute on function public.get_student_game_state(text, uuid) to anon, authenticated;
