-- Week 6 Module 3: deterministic model-agency projects with trusted scoring.
create or replace function public.week6_model_agency_type(project_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when project_id ~ '^F0[1-6]$' then 'physical'
    when project_id ~ '^A0[1-6]$' then 'analog'
    when project_id ~ '^S0[1-6]$' then 'schematic'
    when project_id ~ '^M0[1-6]$' then 'mathematical'
    else null
  end;
$$;

create or replace function public.week6_model_agency_score(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedProjectIds';
  responses jsonb := coalesce(payload, '{}'::jsonb) -> 'responses';
  response jsonb;
  ordinal bigint;
  project_id text;
  selected_type text;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-6-model-agency-v1'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(responses) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(responses) > 5 then
    return 0;
  end if;

  if exists (
      select 1 from jsonb_array_elements_text(selected) project(value)
      where public.week6_model_agency_type(project.value) is null
    )
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week6_model_agency_type(value)) from jsonb_array_elements_text(selected)) <> 4 then
    return 0;
  end if;

  for response, ordinal in
    select value, ordinality from jsonb_array_elements(responses) with ordinality
  loop
    project_id := selected ->> (ordinal::int - 1);
    selected_type := response ->> 'selectedModelType';
    if jsonb_typeof(response) is distinct from 'object'
      or response ->> 'projectId' is distinct from project_id
      or selected_type not in ('physical', 'analog', 'schematic', 'mathematical') then
      return 0;
    end if;
    if selected_type = public.week6_model_agency_type(project_id) then
      result := result + 20;
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
    when target_week_id = 6 and target_module_id = 1
      then public.week6_flow_operation_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v2'
      then public.week6_simulation_repair_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v3'
      then public.week6_simulation_repair_score_v3(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 then 0
    when target_week_id = 6 and target_module_id = 3
      then public.week6_model_agency_score(coalesce(new_payload, '{}'::jsonb))
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
    or (target_session.selected_week in (3, 4, 5, 6) and target_module_id > 3)
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

-- The current finalizer owns atomic partial submissions and bonus updates. Extend
-- only its Week 6 no-speed-bonus list so the existing transaction remains intact.
do $$
declare
  current_definition text;
  updated_definition text;
begin
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  updated_definition := regexp_replace(
    current_definition,
    'target_session\.selected_week = 6\s+and target_session\.current_module in \(1, 2\)',
    'target_session.selected_week = 6 and target_session.current_module in (1, 2, 3)',
    'i'
  );
  if updated_definition = current_definition then
    raise exception 'Could not extend Week 6 no-speed-bonus rule';
  end if;
  execute updated_definition;
end;
$$;

revoke all on function public.week6_model_agency_type(text) from public, anon, authenticated;
revoke all on function public.week6_model_agency_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int, int, jsonb, int) from public, anon, authenticated;
revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.week6_model_agency_type(text) to service_role;
grant execute on function public.week6_model_agency_score(jsonb) to service_role;
grant execute on function public.validated_module_score(int, int, jsonb, int) to service_role;
grant execute on function public.start_session_module(uuid, int) to service_role;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;
