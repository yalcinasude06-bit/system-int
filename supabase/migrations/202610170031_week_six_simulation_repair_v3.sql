-- Week 6 Module 2 v3: trusted diagnosis + one-token repair scoring.
create or replace function public.week6_simulation_repair_token_ids(case_id text)
returns text[] language sql immutable set search_path=public as $$
select case case_id
 when 'V01' then array['initial','signProduction','production','signShipping','shipping'] when 'V02' then array['initial','signBirth','birth','signDeath','death'] when 'V03' then array['initial','signArrival','arrival','signComplete','complete']
 when 'V04' then array['initial','inflow','outflow','deltaT'] when 'V05' then array['initial','inflow','outflow','deltaT'] when 'V06' then array['initial','inflow','outflow','deltaT']
 when 'V07' then array['initial','inflow','outflow'] when 'V08' then array['initial','inflow','outflow'] when 'V09' then array['initial','inflow','outflow']
 when 'V10' then array['rate','conversionFactor'] when 'V11' then array['mass','conversionFactor'] when 'V12' then array['total','conversionFactor']
 when 'G13' then array['orderAmount','deliveryDelay','timeUnit'] when 'G14' then array['relation','trainingDelay','measure'] when 'G15' then array['initialRisk','maintenanceDelay','timeUnit']
 when 'G16' then array['foodDeathLink','birthPopulation','deathPopulation'] when 'G17' then array['priceDemandLink','adDemand','productionStock'] when 'G18' then array['queueStaffLink','staffService','serviceQueue']
 when 'G19' then array['lineInput','packingCapacity','step'] when 'G20' then array['initial','inflow','warehouseCapacity'] when 'G21' then array['initial','fill','tankCapacity']
 when 'G22' then array['demandStructure','measure','periods'] when 'G23' then array['initial','target','stockBehavior'] when 'G24' then array['initial','target','responseBehavior'] else null end;
$$;
create or replace function public.week6_simulation_repair_correct_token(case_id text)
returns text language sql immutable set search_path=public as $$ select case case_id when 'V01' then 'signProduction' when 'V02' then 'signDeath' when 'V03' then 'signArrival' when 'V04' then 'deltaT' when 'V05' then 'deltaT' when 'V06' then 'deltaT' when 'V07' then 'initial' when 'V08' then 'initial' when 'V09' then 'initial' when 'V10' then 'conversionFactor' when 'V11' then 'conversionFactor' when 'V12' then 'conversionFactor' when 'G13' then 'deliveryDelay' when 'G14' then 'trainingDelay' when 'G15' then 'maintenanceDelay' when 'G16' then 'foodDeathLink' when 'G17' then 'priceDemandLink' when 'G18' then 'queueStaffLink' when 'G19' then 'packingCapacity' when 'G20' then 'warehouseCapacity' when 'G21' then 'tankCapacity' when 'G22' then 'demandStructure' when 'G23' then 'stockBehavior' when 'G24' then 'responseBehavior' else null end; $$;
create or replace function public.week6_simulation_repair_score_v3(payload jsonb)
returns int language plpgsql immutable set search_path=public as $$
declare selected jsonb:=coalesce(payload,'{}'::jsonb)->'selectedCaseIds'; progress jsonb:=coalesce(payload,'{}'::jsonb)->'progress'; record jsonb; ordinal bigint; case_id text; token_id text; result int:=0;
begin
 if payload->>'gameId' is distinct from 'week-6-simulation-repair-v3' or jsonb_typeof(selected) is distinct from 'array' or jsonb_typeof(progress) is distinct from 'array' or jsonb_array_length(selected)<>5 or jsonb_array_length(progress)>5 then return 0; end if;
 if exists(select 1 from jsonb_array_elements_text(selected) x(value) where public.week6_simulation_repair_category(value) is null) or (select count(distinct value) from jsonb_array_elements_text(selected))<>5 or (select count(distinct public.week6_simulation_repair_category(value)) from jsonb_array_elements_text(selected))<>5 or (select count(*) from jsonb_array_elements_text(selected) x(value) where left(value,1)='V') not between 2 and 3 then return 0; end if;
 for record,ordinal in select value,ordinality from jsonb_array_elements(progress) with ordinality loop
  case_id:=selected->>(ordinal::int-1);
  if jsonb_typeof(record) is distinct from 'object' or record->>'caseId' is distinct from case_id or record->>'diagnosis' not in ('verification','validation') then return 0; end if;
  if record->>'diagnosis'=(case when left(case_id,1)='V' then 'verification' else 'validation' end) then result:=result+8; end if;
  token_id:=record->>'selectedTokenId';
  if token_id is not null then if not(token_id=any(public.week6_simulation_repair_token_ids(case_id))) then return 0; end if; if token_id=public.week6_simulation_repair_correct_token(case_id) then result:=result+12; end if; end if;
 end loop; return greatest(0,least(result,100));
end; $$;
create or replace function public.validated_module_score(target_week_id int,target_module_id int,new_payload jsonb,claimed_score int)
returns int language sql immutable set search_path=public as $$ select case when target_week_id=5 and target_module_id=1 then public.week5_delay_trail_score(coalesce(new_payload,'{}'::jsonb)) when target_week_id=6 and target_module_id=1 then public.week6_flow_operation_score(coalesce(new_payload,'{}'::jsonb)) when target_week_id=6 and target_module_id=2 and new_payload->>'gameId'='week-6-simulation-repair-v2' then public.week6_simulation_repair_score(coalesce(new_payload,'{}'::jsonb)) when target_week_id=6 and target_module_id=2 and new_payload->>'gameId'='week-6-simulation-repair-v3' then public.week6_simulation_repair_score_v3(coalesce(new_payload,'{}'::jsonb)) when target_week_id=6 and target_module_id=2 then 0 else greatest(0,least(coalesce(claimed_score,0),public.module_score_cap(target_week_id,target_module_id))) end; $$;
revoke all on function public.week6_simulation_repair_token_ids(text) from public,anon,authenticated; revoke all on function public.week6_simulation_repair_correct_token(text) from public,anon,authenticated; revoke all on function public.week6_simulation_repair_score_v3(jsonb) from public,anon,authenticated; revoke all on function public.validated_module_score(int,int,jsonb,int) from public,anon,authenticated;
grant execute on function public.week6_simulation_repair_token_ids(text) to service_role; grant execute on function public.week6_simulation_repair_correct_token(text) to service_role; grant execute on function public.week6_simulation_repair_score_v3(jsonb) to service_role; grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
