-- Week 7 Module 1: five deterministic causal-loop repairs with trusted scoring.
-- No table, RLS, publication, or client grant changes are required.

create or replace function public.week7_loop_case_group(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when case_id in ('W01','W02','W03','W04') then 'water'
    when case_id in ('P01','P02','P03','P04') then 'population'
    when case_id in ('M01','M02','M03','M04') then 'market'
    when case_id in ('B01','B02','B03','B04') then 'biosphere'
    when case_id in ('U01','U02','U03','U04') then 'production'
    else null
  end;
$$;

create or replace function public.week7_loop_case_signature(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'W01' then 'e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-'
    when 'W02' then 'e1:target>gap:+|e2:gap>power:+|e3:power>heat:+|e4:heat>actual:+|e5:actual>gap:-'
    when 'W03' then 'e1:desired>gap:+|e2:gap>pour:+|e3:pour>amount:+|e4:amount>gap:-'
    when 'W04' then 'e1:target>error:+|e2:error>valve:+|e3:valve>flow:+|e4:flow>pressure:+|e5:pressure>error:-'
    when 'P01' then 'e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:+|e5:adults>births:+'
    when 'P02' then 'e1:fertile>births:+|e2:births>children:+|e3:children>future:+|e4:future>fertile:+'
    when 'P03' then 'e1:population>crowding:+|e2:crowding>pressure:+|e3:pressure>mortality:+|e4:mortality>deaths:+|e5:deaths>population:-'
    when 'P04' then 'e1:children>maturation:+|e2:maturation>children:-|e3:maturation>adults:+|e4:adults>care:+|e5:care>survival:+|e6:survival>children:+'
    when 'M01' then 'e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:+|e5:budget>ads:+'
    when 'M02' then 'e1:backlog>delay:+|e2:delay>newOrders:-|e3:newOrders>incoming:+|e4:incoming>backlog:+|e5:fulfillment>backlog:-'
    when 'M03' then 'e1:satisfaction>recommendations:+|e2:recommendations>customers:+|e3:customers>load:+|e4:load>wait:+|e5:wait>satisfaction:-'
    when 'M04' then 'e1:demand>gap:+|e2:gap>investment:+|e3:investment>capacity:+|e4:capacity>gap:-'
    when 'B01' then 'e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:-'
    when 'B02' then 'e1:humidity>cloud:+|e2:cloud>droplets:+|e3:droplets>rain:+|e4:rain>cloud:-'
    when 'B03' then 'e1:rain>soil:+|e2:soil>growth:+|e3:growth>transpiration:+|e4:transpiration>soil:-'
    when 'B04' then 'e1:temperature>evaporation:+|e2:evaporation>vapor:+|e3:vapor>trapping:+|e4:trapping>temperature:+'
    when 'U01' then 'e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:+|e4:production>inventory:+'
    when 'U02' then 'e1:inventory>excess:+|e2:excess>target:+|e3:target>shipping:+|e4:shipping>inventory:-'
    when 'U03' then 'e1:employees>workload:-|e2:workload>turnover:+|e3:turnover>loss:+|e4:loss>employees:-'
    when 'U04' then 'e1:incoming>backlog:+|e2:backlog>overtime:+|e3:overtime>fulfillment:+|e4:fulfillment>backlog:-'
    else null
  end;
$$;

create or replace function public.week7_loop_repair_score(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedCaseIds';
  completions jsonb := coalesce(payload, '{}'::jsonb) -> 'completions';
  completion jsonb;
  ordinal bigint;
  case_id text;
  result int := 0;
begin
  if coalesce(payload, '{}'::jsonb) ->> 'gameId' is distinct from 'week-7-loop-repair-v1'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(completions) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(completions) > 5 then return 0;
  end if;

  if exists (select 1 from jsonb_array_elements_text(selected) item(value) where public.week7_loop_case_group(item.value) is null)
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week7_loop_case_group(value)) from jsonb_array_elements_text(selected)) <> 5 then return 0;
  end if;

  for completion, ordinal in select value, ordinality from jsonb_array_elements(completions) with ordinality loop
    case_id := selected ->> (ordinal::int - 1);
    if jsonb_typeof(completion) is distinct from 'object'
      or completion ->> 'caseId' is distinct from case_id
      or completion ->> 'signature' is distinct from public.week7_loop_case_signature(case_id) then return 0;
    end if;
    result := result + 20;
  end loop;

  return greatest(0, least(result, 100));
end;
$$;

create or replace function public.validated_module_score(target_week_id int, target_module_id int, new_payload jsonb, claimed_score int)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when target_week_id = 5 and target_module_id = 1 then public.week5_delay_trail_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 1 then public.week6_flow_operation_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v2' then public.week6_simulation_repair_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v3' then public.week6_simulation_repair_score_v3(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v4' then public.week6_simulation_repair_score_v4(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v5' then public.week6_simulation_repair_score_v5(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-6-simulation-repair-v6' then public.week6_simulation_repair_score_v6(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 2 then 0
    when target_week_id = 6 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-6-model-agency-v1' then public.week6_model_agency_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-6-model-agency-v2' then public.week6_model_agency_score_v2(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 3 then 0
    when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v1' then public.week7_loop_repair_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 1 then 0
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
  select * into target_session from public.sessions where id = target_session_id for update;
  if target_session.id is null or not target_session.is_active then raise exception 'Active session not found'; end if;
  if target_session.is_module_started then raise exception 'A module round is already active'; end if;
  if target_module_id < 1
    or (target_session.selected_week = 1 and target_module_id > 5)
    or (target_session.selected_week in (3, 4, 5, 6) and target_module_id > 3)
    or (target_session.selected_week = 7 and target_module_id > 1)
    or (target_session.selected_week not in (1, 3, 4, 5, 6, 7)) then raise exception 'Invalid module selection';
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

-- Preserve the atomic finalizer and add only Week 7 Module 1 to the no-speed rule.
do $$
declare
  current_definition text;
  updated_definition text;
begin
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  if current_definition !~* 'target_session\.selected_week = 7\s+and target_session\.current_module = 1' then
    updated_definition := regexp_replace(
      current_definition,
      'when\s+\(target_session\.selected_week = 5\s+and target_session\.current_module in \(2, 3\)\)\s+then 0',
      'when (target_session.selected_week = 5 and target_session.current_module in (2, 3)) or (target_session.selected_week = 7 and target_session.current_module = 1) then 0',
      'i'
    );
    if updated_definition = current_definition then raise exception 'Could not extend the no-speed-bonus rule for Week 7'; end if;
    execute updated_definition;
  end if;
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  if current_definition !~* 'target_session\.selected_week = 7\s+and target_session\.current_module = 1' then raise exception 'Week 7 no-speed-bonus verification failed'; end if;
end;
$$;

do $$
declare
  perfect jsonb := '{"gameId":"week-7-loop-repair-v1","selectedCaseIds":["W01","P01","M01","B01","U01"],"completions":[{"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-"},{"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:+|e5:adults>births:+"},{"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:+|e5:budget>ads:+"},{"caseId":"B01","signature":"e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:-"},{"caseId":"U01","signature":"e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:+|e4:production>inventory:+"}]}'::jsonb;
begin
  if public.week7_loop_repair_score(perfect) <> 100 then raise exception 'Loop Repair perfect-score smoke test failed'; end if;
  if public.week7_loop_repair_score(jsonb_set(perfect, '{completions}', (perfect -> 'completions') - 4 - 3 - 2)) <> 40 then raise exception 'Loop Repair partial-score smoke test failed'; end if;
  if public.week7_loop_repair_score(jsonb_set(perfect, '{completions,0,signature}', '"forged"'::jsonb)) <> 0 then raise exception 'Loop Repair must reject forged signatures'; end if;
  if public.week7_loop_repair_score(jsonb_set(perfect, '{selectedCaseIds,1}', '"W02"'::jsonb)) <> 0 then raise exception 'Loop Repair must reject duplicate groups'; end if;
  if public.validated_module_score(7, 1, perfect, 999) <> 100 then raise exception 'Loop Repair validated score routing failed'; end if;
end;
$$;

revoke all on function public.week7_loop_case_group(text) from public, anon, authenticated;
revoke all on function public.week7_loop_case_signature(text) from public, anon, authenticated;
revoke all on function public.week7_loop_repair_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
revoke all on function public.start_session_module(uuid,int) from public, anon, authenticated;
revoke all on function public.finish_session_module(uuid,bigint) from public, anon, authenticated;
grant execute on function public.week7_loop_case_group(text) to service_role;
grant execute on function public.week7_loop_case_signature(text) to service_role;
grant execute on function public.week7_loop_repair_score(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
grant execute on function public.start_session_module(uuid,int) to service_role;
grant execute on function public.finish_session_module(uuid,bigint) to service_role;
