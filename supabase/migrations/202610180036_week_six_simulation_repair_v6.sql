-- Week 6 Module 2 v6: five case types, five-case rounds, and direct 100-point scoring.

create or replace function public.week6_simulation_repair_v6_category(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when case_id in ('V01','V02','V03') then 'sign'
    when case_id in ('V07','V08','V09') then 'initial'
    when case_id in ('V04','V05','V06','V10','V11','V12') then 'time-unit'
    when case_id in ('G13','G14','G15','G23') then 'delay'
    when case_id in ('G19','G20','G21','G22') then 'capacity'
    else null
  end;
$$;

create or replace function public.week6_simulation_repair_v6_token_ids(case_id text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'V01' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V02' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V03' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V04' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8']
    when 'V05' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8']
    when 'V06' then array['cell-0','cell-1','cell-2','cell-3','cell-4','cell-5','cell-6','cell-7','cell-8']
    when 'V07' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V08' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V09' then array['cell-0','cell-1','cell-2','cell-3','cell-4']
    when 'V10' then array['cell-0','cell-1','cell-2']
    when 'V11' then array['cell-0','cell-1','cell-2']
    when 'V12' then array['cell-0','cell-1','cell-2']
    when 'G13' then array['orderAmount','deliveryDelay','measurement']
    when 'G14' then array['initialQuality','trainingDelay','measurement']
    when 'G15' then array['initialRisk','maintenanceDelay','measurement']
    when 'G23' then array['initialTemperature','coolingDelay','measurement']
    when 'G19' then array['packedStart','lineInput','packingCapacity']
    when 'G20' then array['stockStart','stockInput','warehouseCapacity']
    when 'G21' then array['tankStart','tankFill','tankCapacity']
    when 'G22' then array['seatedStart','customerInput','seatingCapacity']
    else null
  end;
$$;

create or replace function public.week6_simulation_repair_v6_correct_token(case_id text)
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
    when 'G13' then 'deliveryDelay' when 'G14' then 'trainingDelay'
    when 'G15' then 'maintenanceDelay' when 'G23' then 'coolingDelay'
    when 'G19' then 'packingCapacity' when 'G20' then 'warehouseCapacity'
    when 'G21' then 'tankCapacity' when 'G22' then 'seatingCapacity'
    else null
  end;
$$;

create or replace function public.week6_simulation_repair_score_v6(payload jsonb)
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
  raw_score int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-6-simulation-repair-v6'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(progress) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(progress) > 5 then return 0;
  end if;

  if exists (select 1 from jsonb_array_elements_text(selected) item(value) where public.week6_simulation_repair_v6_category(item.value) is null)
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week6_simulation_repair_v6_category(value)) from jsonb_array_elements_text(selected)) <> 5
    or (select count(*) from jsonb_array_elements_text(selected) item(value) where left(value, 1) = 'V') <> 3 then return 0;
  end if;

  for record, ordinal in select value, ordinality from jsonb_array_elements(progress) with ordinality loop
    case_id := selected ->> (ordinal::int - 1);
    token_id := record ->> 'selectedTokenId';
    if jsonb_typeof(record) is distinct from 'object'
      or record ->> 'caseId' is distinct from case_id
      or record ->> 'diagnosis' is null
      or record ->> 'diagnosis' not in ('verification', 'validation') then return 0;
    end if;
    if token_id is null and ordinal < jsonb_array_length(progress) then return 0; end if;
    if record ->> 'diagnosis' = (case when left(case_id, 1) = 'V' then 'verification' else 'validation' end) then raw_score := raw_score + 8; end if;
    if token_id is not null then
      if not (token_id = any(public.week6_simulation_repair_v6_token_ids(case_id))) then return 0; end if;
      if token_id = public.week6_simulation_repair_v6_correct_token(case_id) then raw_score := raw_score + 12; end if;
    end if;
  end loop;

  return greatest(0, least(raw_score, 100));
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
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

do $$
declare
  perfect jsonb := '{"gameId":"week-6-simulation-repair-v6","selectedCaseIds":["V01","V07","V04","G13","G19"],"progress":[{"caseId":"V01","diagnosis":"verification","selectedTokenId":"cell-1"},{"caseId":"V07","diagnosis":"verification","selectedTokenId":"cell-0"},{"caseId":"V04","diagnosis":"verification","selectedTokenId":"cell-8"},{"caseId":"G13","diagnosis":"validation","selectedTokenId":"deliveryDelay"},{"caseId":"G19","diagnosis":"validation","selectedTokenId":"packingCapacity"}]}'::jsonb;
  diagnosis_only jsonb := '{"gameId":"week-6-simulation-repair-v6","selectedCaseIds":["V01","V07","V04","G13","G19"],"progress":[{"caseId":"V01","diagnosis":"verification"}]}'::jsonb;
begin
  if public.week6_simulation_repair_score_v6(perfect) <> 100 then raise exception 'Simulation Repair v6 perfect-score smoke test failed'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(perfect, '{progress}', (perfect -> 'progress') - 4 - 3)) <> 60 then raise exception 'Simulation Repair v6 partial-score smoke test failed'; end if;
  if public.week6_simulation_repair_score_v6(diagnosis_only) <> 8 then raise exception 'Simulation Repair v6 diagnosis-only smoke test failed'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(perfect, '{progress,0,diagnosis}', '"validation"'::jsonb)) <> 92 then raise exception 'Simulation Repair v6 wrong-diagnosis partial score failed'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(perfect, '{selectedCaseIds}', (perfect -> 'selectedCaseIds') - 4)) <> 0 then raise exception 'Simulation Repair v6 must reject four-case rounds'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(perfect, '{progress,0,selectedTokenId}', '"forged"'::jsonb)) <> 0 then raise exception 'Simulation Repair v6 must reject forged tokens'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(diagnosis_only, '{progress}', '[{"caseId":"V01","selectedTokenId":"cell-1"}]'::jsonb)) <> 0 then raise exception 'Simulation Repair v6 must require diagnosis before repair'; end if;
  if public.week6_simulation_repair_score_v6(jsonb_set(perfect, '{selectedCaseIds,4}', '"G16"'::jsonb)) <> 0 then raise exception 'Simulation Repair v6 must reject removed relation cases'; end if;
  if public.week6_simulation_repair_score_v5('{"gameId":"week-6-simulation-repair-v5","selectedCaseIds":["V01","V07","V04","G13","G16","G19"],"progress":[{"caseId":"V01","diagnosis":"verification","selectedTokenId":"cell-1"},{"caseId":"V07","diagnosis":"verification","selectedTokenId":"cell-0"},{"caseId":"V04","diagnosis":"verification","selectedTokenId":"cell-8"},{"caseId":"G13","diagnosis":"validation","selectedTokenId":"deliveryDelay"},{"caseId":"G16","diagnosis":"validation","selectedTokenId":"foodMortality"},{"caseId":"G19","diagnosis":"validation","selectedTokenId":"packingCapacity"}]}'::jsonb) <> 100 then raise exception 'Simulation Repair v5 compatibility smoke test failed'; end if;
end;
$$;

revoke all on function public.week6_simulation_repair_v6_category(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_v6_token_ids(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_v6_correct_token(text) from public, anon, authenticated;
revoke all on function public.week6_simulation_repair_score_v6(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
grant execute on function public.week6_simulation_repair_v6_category(text) to service_role;
grant execute on function public.week6_simulation_repair_v6_token_ids(text) to service_role;
grant execute on function public.week6_simulation_repair_v6_correct_token(text) to service_role;
grant execute on function public.week6_simulation_repair_score_v6(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
