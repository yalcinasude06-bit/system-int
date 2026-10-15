-- Replace Week 5 Module 1 (Chain-Reaction Chaos) with Tracing the Delay.
-- The existing draft/submission schema is reused. Scores for this module are
-- derived from the selected case, answer sequence and completed reveal state.

create or replace function public.week5_delay_trail_initiator(case_id text)
returns int
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'G01' then 0 when 'G02' then 1 when 'G03' then 0 when 'G04' then 1 when 'G05' then 2
    when 'G06' then 1 when 'G07' then 0 when 'G08' then 2 when 'G09' then 1 when 'G10' then 0
    when 'G11' then 0 when 'G12' then 1 when 'G13' then 0 when 'G14' then 1 when 'G15' then 2
    when 'G16' then 0 when 'G17' then 1 when 'G18' then 2 when 'G19' then 1 when 'G20' then 0
    when 'G21' then 0 when 'G22' then 1 when 'G23' then 2 when 'G24' then 0 when 'G25' then 1
    else null
  end;
$$;

create or replace function public.week5_delay_trail_score(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedCaseIds';
  records jsonb := coalesce(payload, '{}'::jsonb) -> 'records';
  answer jsonb;
  ordinal bigint;
  case_id text;
  initiator int;
  first_choice int;
  second_choice int;
  reveal_index int;
  answer_count int;
  result int := 0;
begin
  if coalesce(payload ->> 'gameId', '') <> 'week-5-delay-trail-v1'
    or jsonb_typeof(selected) <> 'array'
    or jsonb_typeof(records) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(selected) <> 5 then
    return 0;
  end if;

  if not (
    (selected ->> 0) in ('G01','G02','G03','G04','G05')
    and (selected ->> 1) in ('G06','G07','G08','G09','G10')
    and (selected ->> 2) in ('G11','G12','G13','G14','G15')
    and (selected ->> 3) in ('G16','G17','G18','G19','G20')
    and (selected ->> 4) in ('G21','G22','G23','G24','G25')
  ) then
    return 0;
  end if;

  for answer, ordinal in
    select value, ordinality
    from jsonb_array_elements(records) with ordinality
  loop
    if ordinal > 5 or jsonb_typeof(answer) <> 'object' then
      continue;
    end if;
    case_id := answer ->> 'caseId';
    initiator := public.week5_delay_trail_initiator(case_id);
    if initiator is null or case_id is distinct from (selected ->> (ordinal::int - 1)) then
      continue;
    end if;
    reveal_index := case when coalesce(answer ->> 'revealedThrough', '') ~ '^-?[0-9]+$' then (answer ->> 'revealedThrough')::int else -1 end;
    if reveal_index < 5 or jsonb_typeof(answer -> 'selections') <> 'array' then
      continue;
    end if;
    answer_count := jsonb_array_length(answer -> 'selections');
    first_choice := case when coalesce(answer -> 'selections' ->> 0, '') ~ '^[0-5]$' then (answer -> 'selections' ->> 0)::int else -1 end;
    second_choice := case when coalesce(answer -> 'selections' ->> 1, '') ~ '^[0-5]$' then (answer -> 'selections' ->> 1)::int else -1 end;

    if answer ->> 'resolution' = 'first'
      and answer_count = 1
      and first_choice = initiator then
      result := result + 20;
    elsif answer ->> 'resolution' = 'second'
      and answer_count = 2
      and first_choice <> initiator
      and second_choice = initiator then
      result := result + 10;
    end if;
  end loop;

  return greatest(0, least(result, 100));
end;
$$;

create or replace function public.validated_module_score(
  target_week_id int,
  target_module_id int,
  new_payload jsonb,
  claimed_score int
)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when target_week_id = 5 and target_module_id = 1
      then public.week5_delay_trail_score(coalesce(new_payload, '{}'::jsonb))
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

create or replace function public.validate_module_draft_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.score := public.validated_module_score(new.week_id, new.module_id, new.payload, new.score);
  return new;
end;
$$;

drop trigger if exists module_drafts_validate_score on public.module_drafts;
create trigger module_drafts_validate_score
before insert or update of payload, score on public.module_drafts
for each row execute function public.validate_module_draft_score();

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
  bounded_score int := public.validated_module_score(target_week_id, target_module_id, new_payload, new_score);
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
  values (target_session.teacher_username, target_student.student_number, target_student.nickname, bounded_score, timezone('utc', now()))
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
           public.validated_module_score(draft.week_id, draft.module_id, draft.payload, draft.score) as score
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

  -- Deliberately exclude Tracing the Delay: reading speed is not rewarded.
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
      and not (target_session.selected_week = 5 and target_session.current_module = 1)
  ), calculated as (
    select ranked.*,
           round(
             (case
               when ranked.group_size = 1 then 10
               else round(10.0 * (ranked.group_size - 1 - ranked.position) / (ranked.group_size - 1))::int
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

revoke all on function public.week5_delay_trail_initiator(text) from public, anon, authenticated;
revoke all on function public.week5_delay_trail_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int, int, jsonb, int) from public, anon, authenticated;
revoke all on function public.validate_module_draft_score() from public, anon, authenticated;

revoke all on function public.submit_module_once(uuid, uuid, int, int, bigint, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, bigint, int, jsonb, int) to anon, authenticated;

revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;
