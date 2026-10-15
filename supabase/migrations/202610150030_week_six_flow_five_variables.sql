-- Revise Week 6 Module 1 into one factory flow with five hidden-variable
-- question types. Scoring is derived from the semantic question/value pair;
-- client scores, correctness flags, and answer positions are never trusted.
-- The legacy v2 validator remains available for drafts created before release.
-- No table grants, RLS policies, or schema objects are widened here.

create or replace function public.week6_flow_operation_question_kind(scenario_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when scenario_id ~ '^Q0[1-6]$' then 'production'
    when scenario_id ~ '^Q(0[7-9]|1[0-2])$' then 'shipping'
    when scenario_id ~ '^Q1[3-8]$' then 'final'
    when scenario_id ~ '^Q(19|2[0-4])$' then 'duration'
    when scenario_id ~ '^Q(2[5-9]|30)$' then 'initial'
    else null
  end;
$$;

create or replace function public.week6_flow_operation_question_score(
  scenario_id text,
  action jsonb
)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_kind text := public.week6_flow_operation_question_kind(scenario_id);
  expected_value int;
  selected_value int;
begin
  if expected_kind is null
    or jsonb_typeof(action) is distinct from 'object'
    or action ->> 'kind' is distinct from expected_kind
    or jsonb_typeof(action -> 'value') is distinct from 'number'
    or action ->> 'value' !~ '^[0-9]+$' then
    return 0;
  end if;

  expected_value := case scenario_id
    when 'Q01' then 14 when 'Q02' then 8 when 'Q03' then 4
    when 'Q04' then 9 when 'Q05' then 4 when 'Q06' then 11
    when 'Q07' then 8 when 'Q08' then 6 when 'Q09' then 8
    when 'Q10' then 6 when 'Q11' then 6 when 'Q12' then 8
    when 'Q13' then 55 when 'Q14' then 48 when 'Q15' then 37
    when 'Q16' then 82 when 'Q17' then 45 when 'Q18' then 72
    when 'Q19' then 3 when 'Q20' then 3 when 'Q21' then 3
    when 'Q22' then 2 when 'Q23' then 4 when 'Q24' then 3
    when 'Q25' then 50 when 'Q26' then 48 when 'Q27' then 65
    when 'Q28' then 60 when 'Q29' then 75 when 'Q30' then 50
    else null
  end;
  selected_value := (action ->> 'value')::int;
  return case when selected_value = expected_value then 20 else 0 end;
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
  game_id text := payload ->> 'gameId';
  record jsonb;
  ordinal bigint;
  scenario_id text;
  result int := 0;
begin
  if jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(records) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(records) > 5 then
    return 0;
  end if;

  if game_id = 'week-6-flow-operation-v3' then
    if exists (
        select 1 from jsonb_array_elements_text(selected) item(value)
        where public.week6_flow_operation_question_kind(item.value) is null
      )
      or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
      or (select count(distinct public.week6_flow_operation_question_kind(value)) from jsonb_array_elements_text(selected)) <> 5 then
      return 0;
    end if;

    for record, ordinal in
      select value, ordinality from jsonb_array_elements(records) with ordinality
    loop
      scenario_id := selected ->> (ordinal::int - 1);
      if jsonb_typeof(record) is distinct from 'object'
        or record ->> 'scenarioId' is distinct from scenario_id then
        return 0;
      end if;
      result := result + public.week6_flow_operation_question_score(scenario_id, record -> 'action');
    end loop;
  elsif game_id = 'week-6-flow-operation-v2' then
    if selected ->> 0 !~ '^A[1-6]$'
      or selected ->> 1 !~ '^B[1-6]$'
      or selected ->> 2 !~ '^C[1-6]$'
      or selected ->> 3 !~ '^D[1-6]$'
      or selected ->> 4 !~ '^E[1-6]$'
      or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5 then
      return 0;
    end if;

    for record, ordinal in
      select value, ordinality from jsonb_array_elements(records) with ordinality
    loop
      if jsonb_typeof(record) is distinct from 'object' then continue; end if;
      scenario_id := selected ->> (ordinal::int - 1);
      if record ->> 'scenarioId' is distinct from scenario_id then continue; end if;
      result := result + public.week6_flow_operation_action_score(scenario_id, record -> 'action');
    end loop;
  else
    return 0;
  end if;

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

revoke all on function public.week6_flow_operation_question_kind(text) from public, anon, authenticated;
revoke all on function public.week6_flow_operation_question_score(text, jsonb) from public, anon, authenticated;
revoke all on function public.week6_flow_operation_score(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int, int, jsonb, int) from public, anon, authenticated;
grant execute on function public.week6_flow_operation_question_kind(text) to service_role;
grant execute on function public.week6_flow_operation_question_score(text, jsonb) to service_role;
grant execute on function public.week6_flow_operation_score(jsonb) to service_role;
grant execute on function public.validated_module_score(int, int, jsonb, int) to service_role;
