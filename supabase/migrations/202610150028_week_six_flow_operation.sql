-- Replace the reverted Week 6 implementation with the new five-stage Flow
-- Operation. Migration 027 remains in history because it was already applied;
-- this forward migration narrows Week 6 to Module 1 and replaces its validator.
-- No table grants, RLS policy, or historical scores are changed.

create or replace function public.week6_flow_operation_action_score(
  scenario_id text,
  action jsonb
)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_kind text;
  value_text text;
  expected_value int;
begin
  if jsonb_typeof(action) is distinct from 'object' then
    return 0;
  end if;

  expected_kind := case left(scenario_id, 1)
    when 'A' then 'warehouse'
    when 'B' then 'tank'
    when 'C' then 'missing'
    when 'D' then 'timeline'
    when 'E' then 'graph'
    else null
  end;

  if expected_kind is null or action ->> 'kind' is distinct from expected_kind then
    return 0;
  end if;

  if expected_kind = 'warehouse' then
    expected_value := case scenario_id
      when 'A1' then 14 when 'A2' then 14 when 'A3' then 20
      when 'A4' then 13 when 'A5' then 17 when 'A6' then 12
      else null
    end;
    value_text := action ->> 'productionRate';
  elsif expected_kind = 'tank' then
    expected_value := case scenario_id
      when 'B1' then 16 when 'B2' then 16 when 'B3' then 15
      when 'B4' then 20 when 'B5' then 16 when 'B6' then 18
      else null
    end;
    value_text := action ->> 'outflowRate';
  elsif expected_kind = 'missing' then
    expected_value := case scenario_id
      when 'C1' then 10 when 'C2' then 10 when 'C3' then 9
      when 'C4' then 14 when 'C5' then 10 when 'C6' then 10
      else null
    end;
    value_text := action ->> 'flowValue';
  elsif expected_kind = 'timeline' then
    return case
      when action ->> 'direction' = case scenario_id
        when 'D1' then 'up' when 'D2' then 'down' when 'D3' then 'flat'
        when 'D4' then 'up' when 'D5' then 'down' when 'D6' then 'flat'
        else null
      end then 20
      else 0
    end;
  else
    return case when action ->> 'graphId' = scenario_id || '-model' then 20 else 0 end;
  end if;

  if expected_value is null or coalesce(value_text, '') !~ '^[0-9]+$' then
    return 0;
  end if;
  return case when value_text::int = expected_value then 20 else 0 end;
end;
$$;

create or replace function public.week6_flow_operation_score(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedScenarioIds';
  records jsonb := coalesce(payload, '{}'::jsonb) -> 'records';
  record jsonb;
  ordinal bigint;
  scenario_id text;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-6-flow-operation-v2'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(records) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(records) > 5 then
    return 0;
  end if;

  if selected ->> 0 !~ '^A[1-6]$'
    or selected ->> 1 !~ '^B[1-6]$'
    or selected ->> 2 !~ '^C[1-6]$'
    or selected ->> 3 !~ '^D[1-6]$'
    or selected ->> 4 !~ '^E[1-6]$'
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5 then
    return 0;
  end if;

  for record, ordinal in
    select value, ordinality
    from jsonb_array_elements(records) with ordinality
  loop
    if jsonb_typeof(record) is distinct from 'object' then
      continue;
    end if;
    scenario_id := selected ->> (ordinal::int - 1);
    if record ->> 'scenarioId' is distinct from scenario_id then
      continue;
    end if;
    result := result + public.week6_flow_operation_action_score(scenario_id, record -> 'action');
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
    when target_week_id = 6 and target_module_id = 1
      then public.week6_flow_operation_score(coalesce(new_payload, '{}'::jsonb))
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
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
  module_key text;
  next_module_turn int;
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
    or (target_session.selected_week in (3, 4, 5) and target_module_id > 3)
    or (target_session.selected_week = 6 and target_module_id <> 1)
    or (target_session.selected_week not in (1, 3, 4, 5, 6)) then
    raise exception 'Invalid module selection';
  end if;

  module_key := format('%s:%s', target_session.selected_week, target_module_id);
  next_module_turn := coalesce((target_session.module_turn_counters ->> module_key)::int, 0) + 1;

  update public.sessions
  set current_run_number = current_run_number + 1,
      current_module = target_module_id,
      current_module_turn = next_module_turn,
      module_turn_counters = jsonb_set(coalesce(module_turn_counters, '{}'::jsonb), array[module_key], to_jsonb(next_module_turn), true),
      module_stage = 2,
      is_module_started = true,
      module_started_at = clock_timestamp(),
      fault_injected = false
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
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

  -- Keep the existing accuracy-weighted group ranking for every eligible
  -- module. Week 5 Modules 2 and 3 are fixed-duration games, so their bonus
  -- is explicitly zero while Week 5 Module 1 and earlier modules are unchanged.
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
           case
             when (target_session.selected_week = 5 and target_session.current_module in (2, 3))
               or (target_session.selected_week = 6 and target_session.current_module = 1) then 0
             else round(
               (case
                 when ranked.group_size = 1 then 10
                 else round(10.0 * (ranked.group_size - 1 - ranked.position) / (ranked.group_size - 1))::int
               end)
               * greatest(0, least(ranked.score, public.module_score_cap(target_session.selected_week, target_session.current_module)))
               / public.module_score_cap(target_session.selected_week, target_session.current_module)::numeric
             )::int
           end as calculated_bonus
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

revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;

revoke all on function public.week6_task_correct_index(int, text) from public, anon, authenticated;
revoke all on function public.week6_module_score(int, jsonb) from public, anon, authenticated;
revoke all on function public.week6_flow_operation_action_score(text, jsonb) from public, anon, authenticated;
revoke all on function public.week6_flow_operation_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int, int, jsonb, int) from public, anon, authenticated;
revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
grant execute on function public.week6_flow_operation_action_score(text, jsonb) to service_role;
grant execute on function public.week6_flow_operation_score(jsonb) to service_role;
grant execute on function public.validated_module_score(int, int, jsonb, int) to service_role;
grant execute on function public.start_session_module(uuid, int) to service_role;
