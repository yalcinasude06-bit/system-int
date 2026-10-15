-- Add Week 6 Module 2 without reopening browser access to database tables.
-- All scoring is recomputed from semantic answers on the trusted server path.

create or replace function public.week6_simulation_repair_category(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when case_id ~ '^V0[1-3]$' then 'sign'
    when case_id ~ '^V0[4-6]$' then 'timestep'
    when case_id ~ '^V0[7-9]$' then 'initial'
    when case_id ~ '^V1[0-2]$' then 'unit'
    when case_id ~ '^G1[3-5]$' then 'delay'
    when case_id ~ '^G1[6-8]$' then 'relation'
    when case_id ~ '^G(19|2[01])$' then 'capacity'
    when case_id ~ '^G2[2-4]$' then 'behavior'
    else null
  end;
$$;

create or replace function public.week6_simulation_repair_part_score(
  case_id text,
  diagnosis text,
  repair jsonb
)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  category text := public.week6_simulation_repair_category(case_id);
  result int := 0;
  value_number numeric;
begin
  if category is null then
    return 0;
  end if;

  if diagnosis = (case when left(case_id, 1) = 'V' then 'verification' else 'validation' end) then
    result := result + 8;
  end if;

  if jsonb_typeof(repair) is distinct from 'object'
    or repair ->> 'kind' is distinct from category then
    return result;
  end if;

  if category = 'sign' then
    if repair -> 'signs' = '["+", "-"]'::jsonb then result := result + 12; end if;
  elsif category in ('timestep', 'initial', 'capacity') then
    if jsonb_typeof(repair -> 'value') is distinct from 'number' then return result; end if;
    value_number := (repair ->> 'value')::numeric;
    if value_number = (case case_id
      when 'V04' then .5 when 'V05' then .25 when 'V06' then .2
      when 'V07' then 80 when 'V08' then 24 when 'V09' then 60
      when 'G19' then 12 when 'G20' then 500 when 'G21' then 100
      else null end) then result := result + 12; end if;
  elsif category = 'unit' then
    if repair ->> 'operation' = (case case_id
      when 'V10' then 'times24' when 'V11' then 'divide1000' when 'V12' then 'percentOf200'
      else null end) then result := result + 12; end if;
  elsif category = 'delay' then
    if jsonb_typeof(repair -> 'value') is distinct from 'number' then return result; end if;
    value_number := (repair ->> 'value')::numeric;
    if value_number = (case case_id when 'G13' then 4 when 'G14' then 2 when 'G15' then 3 else null end)
      and repair ->> 'unit' = (case when case_id = 'G14' then 'weeks' else 'days' end)
      then result := result + 12;
    end if;
  elsif category = 'relation' then
    if repair ->> 'from' = (case case_id when 'G16' then 'food' when 'G17' then 'price' when 'G18' then 'queue' else null end)
      and repair ->> 'to' = (case case_id when 'G16' then 'death' when 'G17' then 'demand' when 'G18' then 'shift' else null end)
      and repair ->> 'polarity' = (case when case_id in ('G16', 'G17') then 'negative' else 'positive' end)
      then result := result + 12;
    end if;
  elsif category = 'behavior' then
    if repair ->> 'structure' = (case case_id
      when 'G22' then 'seasonal' when 'G23' then 'balancing' when 'G24' then 'delayed'
      else null end) then result := result + 12; end if;
  end if;

  return result;
end;
$$;

create or replace function public.week6_simulation_repair_score(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedCaseIds';
  progress jsonb := coalesce(payload, '{}'::jsonb) -> 'progress';
  record jsonb;
  ordinal bigint;
  case_id text;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-6-simulation-repair-v2'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(progress) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(progress) > 5 then
    return 0;
  end if;

  if exists (
      select 1 from jsonb_array_elements_text(selected) item(value)
      where public.week6_simulation_repair_category(item.value) is null
    )
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week6_simulation_repair_category(value)) from jsonb_array_elements_text(selected)) <> 5
    or (select count(*) from jsonb_array_elements_text(selected) item(value) where left(item.value, 1) = 'V') not between 2 and 3 then
    return 0;
  end if;

  for record, ordinal in
    select value, ordinality
    from jsonb_array_elements(progress) with ordinality
  loop
    case_id := selected ->> (ordinal::int - 1);
    if jsonb_typeof(record) is distinct from 'object'
      or record ->> 'caseId' is distinct from case_id then
      return 0;
    end if;
    result := result + public.week6_simulation_repair_part_score(case_id, record ->> 'diagnosis', record -> 'repair');
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
    when target_week_id = 6 and target_module_id = 2
      then public.week6_simulation_repair_score(coalesce(new_payload, '{}'::jsonb))
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
    or (target_session.selected_week = 6 and target_module_id > 2)
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
    if target_session.module_stage >= 3 then return target_session; end if;
    raise exception 'Module is not open';
  end if;

  with candidates as (
    select draft.session_id, draft.student_id, draft.student_number, draft.week_id, draft.module_id,
           draft.run_number, draft.stage,
           coalesce(draft.payload, '{}'::jsonb) || jsonb_build_object(
             'completionReason', 'teacher-ended', 'answeredCount', draft.answered_count,
             'autoFinalized', true, 'fromDraft', true
           ) as payload,
           public.validated_module_score(draft.week_id, draft.module_id, draft.payload, draft.score) as score
    from public.module_drafts draft
    where draft.session_id = target_session.id
      and draft.week_id = target_session.selected_week
      and draft.module_id = target_session.current_module
      and draft.run_number = target_session.current_run_number

    union all

    select target_session.id, student.id, student.student_number, target_session.selected_week,
           target_session.current_module, target_session.current_run_number,
           greatest(target_session.module_stage, 1),
           jsonb_build_object('completionReason', 'teacher-ended', 'answeredCount', 0,
             'autoFinalized', true, 'fromDraft', false),
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
    select candidate.session_id, candidate.student_id, candidate.student_number, candidate.week_id,
           candidate.module_id, candidate.run_number, candidate.stage, candidate.payload, candidate.score,
           0, true, 'incomplete', timezone('utc', now()), timezone('utc', now())
    from candidates candidate
    on conflict (session_id, student_number, week_id, module_id, run_number) do nothing
    returning student_id, student_number, score
  ), score_totals as (
    select student_id, student_number, sum(score)::int as score_delta
    from inserted group by student_id, student_number
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
  select target_session.teacher_username, total.student_number, student.nickname,
         total.score_delta, timezone('utc', now())
  from score_totals total join public.students student on student.id = total.student_id
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  with ranked as (
    select submission.id, submission.student_id, submission.student_number, submission.score,
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
               or (target_session.selected_week = 6 and target_session.current_module in (1, 2)) then 0
             else round(
               (case when ranked.group_size = 1 then 10
                 else round(10.0 * (ranked.group_size - 1 - ranked.position) / (ranked.group_size - 1))::int end)
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
    returning submission.student_id, submission.student_number,
              calculated.calculated_bonus - calculated.speed_bonus as bonus_delta
  ), bonus_totals as (
    select student_id, student_number, sum(bonus_delta)::int as bonus_delta
    from changed group by student_id, student_number
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
  select target_session.teacher_username, total.student_number, student.nickname,
         total.bonus_delta, timezone('utc', now())
  from bonus_totals total join public.students student on student.id = total.student_id
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
  set is_module_started = false, module_started_at = null, module_stage = 3
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

revoke all on function public.week6_simulation_repair_category(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_part_score(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int, int, jsonb, int) from public, anon, authenticated;
revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.week6_simulation_repair_category(text) to service_role;
grant execute on function public.week6_simulation_repair_part_score(text, text, jsonb) to service_role;
grant execute on function public.week6_simulation_repair_score(jsonb) to service_role;
grant execute on function public.validated_module_score(int, int, jsonb, int) to service_role;
grant execute on function public.start_session_module(uuid, int) to service_role;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;
