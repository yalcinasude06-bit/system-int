-- Week 6 collective revision: M2 direct-token scoring, M3 ten-project scoring,
-- and the existing accuracy-weighted finish-order bonus for all Week 6 modules.

create or replace function public.week6_simulation_repair_v4_token_ids(case_id text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'V01' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V02' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V03' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V04' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8','cell-9','cell-10']
    when 'V05' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8','cell-9','cell-10']
    when 'V06' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8','cell-9','cell-10']
    when 'V07' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V08' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V09' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6']
    when 'V10' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V11' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V12' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    else public.week6_simulation_repair_token_ids(case_id)
  end;
$$;

create or replace function public.week6_simulation_repair_v4_correct_token(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'V01' then 'cell-1' when 'V02' then 'cell-3' when 'V03' then 'cell-1'
    when 'V04' then 'cell-8' when 'V05' then 'cell-8' when 'V06' then 'cell-8'
    when 'V07' then 'cell-0' when 'V08' then 'cell-0' when 'V09' then 'cell-0'
    when 'V10' then 'cell-2' when 'V11' then 'cell-2' when 'V12' then 'cell-2'
    else public.week6_simulation_repair_correct_token(case_id)
  end;
$$;

create or replace function public.week6_simulation_repair_score_v4(payload jsonb)
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
  token_id text;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-6-simulation-repair-v4'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(progress) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(progress) > 5 then return 0;
  end if;
  if exists (select 1 from jsonb_array_elements_text(selected) item(value) where public.week6_simulation_repair_category(item.value) is null)
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week6_simulation_repair_category(value)) from jsonb_array_elements_text(selected)) <> 5
    or (select count(*) from jsonb_array_elements_text(selected) item(value) where left(value, 1) = 'V') not between 2 and 3 then return 0;
  end if;
  for record, ordinal in select value, ordinality from jsonb_array_elements(progress) with ordinality loop
    case_id := selected ->> (ordinal::int - 1);
    token_id := record ->> 'selectedTokenId';
    if jsonb_typeof(record) is distinct from 'object'
      or record ->> 'caseId' is distinct from case_id
      or record ->> 'diagnosis' not in ('verification', 'validation') then return 0;
    end if;
    if record ->> 'diagnosis' = (case when left(case_id, 1) = 'V' then 'verification' else 'validation' end) then result := result + 8; end if;
    if token_id is not null then
      if not (token_id = any(public.week6_simulation_repair_v4_token_ids(case_id))) then return 0; end if;
      if token_id = public.week6_simulation_repair_v4_correct_token(case_id) then result := result + 12; end if;
    end if;
  end loop;
  return greatest(0, least(result, 100));
end;
$$;

create or replace function public.week6_model_agency_score_v2(payload jsonb)
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
  if payload ->> 'gameId' is distinct from 'week-6-model-agency-v2'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(responses) is distinct from 'array'
    or jsonb_array_length(selected) <> 10
    or jsonb_array_length(responses) > 10 then return 0;
  end if;
  if exists (select 1 from jsonb_array_elements_text(selected) item(value) where public.week6_model_agency_type(item.value) is null)
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 10
    or (select count(*) from (select public.week6_model_agency_type(value) as model_type, count(*) as amount from jsonb_array_elements_text(selected) group by 1 having count(*) >= 2) balanced) <> 4 then return 0;
  end if;
  for response, ordinal in select value, ordinality from jsonb_array_elements(responses) with ordinality loop
    project_id := selected ->> (ordinal::int - 1);
    selected_type := response ->> 'selectedModelType';
    if jsonb_typeof(response) is distinct from 'object'
      or response ->> 'projectId' is distinct from project_id
      or selected_type not in ('physical', 'analog', 'schematic', 'mathematical') then return 0;
    end if;
    if selected_type = public.week6_model_agency_type(project_id) then result := result + 10; end if;
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
    when target_week_id = 6 and target_module_id = 2 then 0
    when target_week_id = 6 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-6-model-agency-v1' then public.week6_model_agency_score(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-6-model-agency-v2' then public.week6_model_agency_score_v2(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 6 and target_module_id = 3 then 0
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

-- Remove only the Week 6 exclusion from the current atomic finalizer. The Week
-- 5 timed-module exclusion and every run/completion/delta guard remain unchanged.
do $$
declare
  current_definition text;
  updated_definition text;
begin
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  if current_definition ~* 'target_session\.selected_week = 6\s+and target_session\.current_module in \(1, 2, 3\)' then
    updated_definition := regexp_replace(current_definition, '\s+or\s+\(target_session\.selected_week = 6\s+and target_session\.current_module in \(1, 2, 3\)\)', '', 'i');
    if updated_definition = current_definition then raise exception 'Could not remove the Week 6 speed-bonus exclusion'; end if;
    execute updated_definition;
  elsif current_definition !~* 'target_session\.selected_week = 5\s+and target_session\.current_module in \(2, 3\)' then
    raise exception 'Unexpected finish_session_module bonus rules';
  end if;
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  if current_definition ~* 'target_session\.selected_week = 6\s+and target_session\.current_module in \(1, 2, 3\)'
    or current_definition !~* 'target_session\.selected_week = 5\s+and target_session\.current_module in \(2, 3\)' then
    raise exception 'Speed-bonus eligibility verification failed';
  end if;
end;
$$;

-- Execute trusted scorer smoke tests inside the migration transaction.
do $$
declare
  agency_payload jsonb := '{"gameId":"week-6-model-agency-v2","selectedProjectIds":["F01","F02","F03","A01","A02","A03","S01","S02","M01","M02"],"responses":[{"projectId":"F01","selectedModelType":"physical"},{"projectId":"F02","selectedModelType":"physical"},{"projectId":"F03","selectedModelType":"physical"},{"projectId":"A01","selectedModelType":"analog"},{"projectId":"A02","selectedModelType":"analog"},{"projectId":"A03","selectedModelType":"analog"},{"projectId":"S01","selectedModelType":"schematic"},{"projectId":"S02","selectedModelType":"schematic"},{"projectId":"M01","selectedModelType":"mathematical"},{"projectId":"M02","selectedModelType":"mathematical"}]}'::jsonb;
  repair_payload jsonb := '{"gameId":"week-6-simulation-repair-v4","selectedCaseIds":["V04","V01","G13","G16","G19"],"progress":[{"caseId":"V04","diagnosis":"verification","selectedTokenId":"cell-8"}]}'::jsonb;
begin
  if public.week6_model_agency_score_v2(agency_payload) <> 100 then raise exception 'Model Agency v2 scorer smoke test failed'; end if;
  if public.week6_model_agency_score_v2(jsonb_set(agency_payload, '{responses}', (agency_payload -> 'responses') - 9 - 8 - 7 - 6 - 5)) <> 50 then raise exception 'Model Agency partial scorer smoke test failed'; end if;
  if public.week6_simulation_repair_score_v4(repair_payload) <> 20 then raise exception 'Simulation Repair v4 scorer smoke test failed'; end if;
end;
$$;

revoke all on function public.week6_simulation_repair_v4_token_ids(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_v4_correct_token(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_score_v4(jsonb) from public, anon, authenticated;
revoke all on function public.week6_model_agency_score_v2(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
revoke all on function public.finish_session_module(uuid,bigint) from public, anon, authenticated;
grant execute on function public.week6_simulation_repair_v4_token_ids(text) to service_role;
grant execute on function public.week6_simulation_repair_v4_correct_token(text) to service_role;
grant execute on function public.week6_simulation_repair_score_v4(jsonb) to service_role;
grant execute on function public.week6_model_agency_score_v2(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
grant execute on function public.finish_session_module(uuid,bigint) to service_role;
