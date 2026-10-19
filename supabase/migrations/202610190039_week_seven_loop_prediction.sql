-- Week 7 Module 1 v3: fixed arrow directions, sign accuracy, and trusted outcome predictions.
-- Functions only: no table, RLS, Realtime publication, or client grant changes.

create or replace function public.week7_loop_prediction_correct_option(case_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'W01' then 'B' when 'W02' then 'A' when 'W03' then 'C' when 'W04' then 'B'
    when 'P01' then 'A' when 'P02' then 'C' when 'P03' then 'B' when 'P04' then 'A'
    when 'M01' then 'C' when 'M02' then 'B' when 'M03' then 'A' when 'M04' then 'C'
    when 'B01' then 'A' when 'B02' then 'C' when 'B03' then 'B' when 'B04' then 'A'
    when 'U01' then 'C' when 'U02' then 'B' when 'U03' then 'A' when 'U04' then 'C'
    else null
  end;
$$;

create or replace function public.week7_loop_signature_v3_valid(case_id text, signature text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_signature text := public.week7_loop_case_signature(case_id);
  expected_parts text[];
  actual_parts text[];
  ordinal int;
begin
  if expected_signature is null or signature is null then return false; end if;
  expected_parts := string_to_array(expected_signature, '|');
  actual_parts := string_to_array(signature, '|');
  if cardinality(actual_parts) <> cardinality(expected_parts) then return false; end if;

  for ordinal in 1..cardinality(expected_parts) loop
    if actual_parts[ordinal] !~ '^[^:|]+:[^:>|]+>[^:>|]+:[+-]$'
      or split_part(actual_parts[ordinal], ':', 1) is distinct from split_part(expected_parts[ordinal], ':', 1)
      or split_part(actual_parts[ordinal], ':', 2) is distinct from split_part(expected_parts[ordinal], ':', 2) then return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.week7_loop_diagram_score_v3(case_id text, signature text)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_parts text[];
  actual_parts text[];
  incorrect_count int := 0;
  ordinal int;
begin
  if not public.week7_loop_signature_v3_valid(case_id, signature) then return 0; end if;
  expected_parts := string_to_array(public.week7_loop_case_signature(case_id), '|');
  actual_parts := string_to_array(signature, '|');
  for ordinal in 1..cardinality(expected_parts) loop
    if split_part(actual_parts[ordinal], ':', 3) is distinct from split_part(expected_parts[ordinal], ':', 3) then
      incorrect_count := incorrect_count + 1;
    end if;
  end loop;
  return case when incorrect_count = 0 then 12 when incorrect_count = 1 then 6 else 0 end;
end;
$$;

create or replace function public.week7_loop_repair_score_v3(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedCaseIds';
  attempts jsonb := coalesce(payload, '{}'::jsonb) -> 'attempts';
  attempt jsonb;
  ordinal bigint;
  case_id text;
  signature text;
  prediction_choice text;
  result int := 0;
begin
  if coalesce(payload, '{}'::jsonb) ->> 'gameId' is distinct from 'week-7-loop-repair-v3'
    or jsonb_typeof(selected) is distinct from 'array'
    or jsonb_typeof(attempts) is distinct from 'array'
    or jsonb_array_length(selected) <> 5
    or jsonb_array_length(attempts) > 5 then return 0;
  end if;

  if exists (select 1 from jsonb_array_elements_text(selected) item(value) where public.week7_loop_case_group(item.value) is null)
    or (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5
    or (select count(distinct public.week7_loop_case_group(value)) from jsonb_array_elements_text(selected)) <> 5 then return 0;
  end if;

  for attempt, ordinal in select value, ordinality from jsonb_array_elements(attempts) with ordinality loop
    case_id := selected ->> (ordinal::int - 1);
    signature := attempt ->> 'signature';
    prediction_choice := attempt ->> 'predictionChoiceId';
    if jsonb_typeof(attempt) is distinct from 'object'
      or attempt ->> 'caseId' is distinct from case_id
      or not public.week7_loop_signature_v3_valid(case_id, signature)
      or (prediction_choice is not null and prediction_choice not in ('A', 'B', 'C')) then return 0;
    end if;
    result := result + public.week7_loop_diagram_score_v3(case_id, signature);
    if prediction_choice = public.week7_loop_prediction_correct_option(case_id) then result := result + 8; end if;
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
    when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v2' then public.week7_loop_repair_score_v2(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-repair-v3' then public.week7_loop_repair_score_v3(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 1 then 0
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

do $$
declare
  selected jsonb := '["W01","P01","M01","B01","U01"]'::jsonb;
  perfect_attempts jsonb := '[
    {"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-","predictionChoiceId":"B"},
    {"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:+|e5:adults>births:+","predictionChoiceId":"A"},
    {"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:+|e5:budget>ads:+","predictionChoiceId":"C"},
    {"caseId":"B01","signature":"e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:-","predictionChoiceId":"A"},
    {"caseId":"U01","signature":"e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:+|e4:production>inventory:+","predictionChoiceId":"C"}
  ]'::jsonb;
  initial_wrong_attempts jsonb := '[
    {"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:-|e4:inflow>level:+|e5:level>gap:+","predictionChoiceId":"A"},
    {"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:+|e4:maturation>adults:-|e5:adults>births:+","predictionChoiceId":"B"},
    {"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:-|e3:demand>revenue:+|e4:revenue>budget:-|e5:budget>ads:+","predictionChoiceId":"A"},
    {"caseId":"B01","signature":"e1:temperature>evaporation:-|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:+","predictionChoiceId":"B"},
    {"caseId":"U01","signature":"e1:inventory>gap:+|e2:gap>plan:+|e3:plan>production:-|e4:production>inventory:+","predictionChoiceId":"A"}
  ]'::jsonb;
  one_error_attempts jsonb := '[
    {"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:+","predictionChoiceId":"B"},
    {"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:-|e5:adults>births:+","predictionChoiceId":"A"},
    {"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:-|e5:budget>ads:+","predictionChoiceId":"C"},
    {"caseId":"B01","signature":"e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:+","predictionChoiceId":"A"},
    {"caseId":"U01","signature":"e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:-|e4:production>inventory:+","predictionChoiceId":"C"}
  ]'::jsonb;
  perfect_v3 jsonb;
  zero_v3 jsonb;
  one_error_v3 jsonb;
  wrong_predictions_v3 jsonb;
  correct_predictions_v3 jsonb;
  legacy_v1 jsonb;
  legacy_v2 jsonb;
begin
  perfect_v3 := jsonb_build_object('gameId','week-7-loop-repair-v3','selectedCaseIds',selected,'attempts',perfect_attempts);
  zero_v3 := jsonb_build_object('gameId','week-7-loop-repair-v3','selectedCaseIds',selected,'attempts',initial_wrong_attempts);
  one_error_v3 := jsonb_build_object('gameId','week-7-loop-repair-v3','selectedCaseIds',selected,'attempts',one_error_attempts);
  wrong_predictions_v3 := jsonb_set(perfect_v3, '{attempts}', jsonb_build_array(
    jsonb_set(perfect_attempts->0,'{predictionChoiceId}','"A"'), jsonb_set(perfect_attempts->1,'{predictionChoiceId}','"B"'),
    jsonb_set(perfect_attempts->2,'{predictionChoiceId}','"A"'), jsonb_set(perfect_attempts->3,'{predictionChoiceId}','"B"'),
    jsonb_set(perfect_attempts->4,'{predictionChoiceId}','"A"')));
  correct_predictions_v3 := jsonb_set(zero_v3, '{attempts}', jsonb_build_array(
    jsonb_set(initial_wrong_attempts->0,'{predictionChoiceId}','"B"'), jsonb_set(initial_wrong_attempts->1,'{predictionChoiceId}','"A"'),
    jsonb_set(initial_wrong_attempts->2,'{predictionChoiceId}','"C"'), jsonb_set(initial_wrong_attempts->3,'{predictionChoiceId}','"A"'),
    jsonb_set(initial_wrong_attempts->4,'{predictionChoiceId}','"C"')));
  legacy_v1 := jsonb_build_object('gameId','week-7-loop-repair-v1','selectedCaseIds',selected,'completions',jsonb_build_array((perfect_attempts->0) - 'predictionChoiceId'));
  legacy_v2 := jsonb_build_object('gameId','week-7-loop-repair-v2','selectedCaseIds',selected,'attempts',jsonb_build_array((perfect_attempts->0) - 'predictionChoiceId'));

  if public.week7_loop_repair_score_v3(perfect_v3) <> 100 then raise exception 'Loop Repair v3 perfect score failed'; end if;
  if public.week7_loop_repair_score_v3(zero_v3) <> 0 then raise exception 'Loop Repair v3 zero score failed'; end if;
  if public.week7_loop_repair_score_v3(one_error_v3) <> 70 then raise exception 'Loop Repair v3 one-error score failed'; end if;
  if public.week7_loop_repair_score_v3(wrong_predictions_v3) <> 60 then raise exception 'Loop Repair v3 diagram-only score failed'; end if;
  if public.week7_loop_repair_score_v3(correct_predictions_v3) <> 40 then raise exception 'Loop Repair v3 prediction-only score failed'; end if;
  if public.week7_loop_repair_score_v3(jsonb_set(perfect_v3,'{attempts,0,signature}','"e1:gap>target:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-"')) <> 0 then raise exception 'Loop Repair v3 must reject reversed directions'; end if;
  if public.week7_loop_repair_score_v3(jsonb_set(perfect_v3,'{attempts,0,predictionChoiceId}','"D"')) <> 0 then raise exception 'Loop Repair v3 must reject invalid prediction ids'; end if;
  if public.week7_loop_repair_score_v3(jsonb_set(perfect_v3,'{selectedCaseIds,1}','"W02"')) <> 0 then raise exception 'Loop Repair v3 must reject duplicate groups'; end if;
  if (select count(*) from unnest(array['W01','W02','W03','W04','P01','P02','P03','P04','M01','M02','M03','M04','B01','B02','B03','B04','U01','U02','U03','U04']) item where public.week7_loop_prediction_correct_option(item) in ('A','B','C')) <> 20 then raise exception 'Loop Repair v3 prediction key coverage failed'; end if;
  if public.validated_module_score(7,1,legacy_v1,999) <> 20 then raise exception 'Loop Repair v1 routing failed'; end if;
  if public.validated_module_score(7,1,legacy_v2,999) <> 20 then raise exception 'Loop Repair v2 routing failed'; end if;
  if public.validated_module_score(7,1,perfect_v3,999) <> 100 then raise exception 'Loop Repair v3 routing failed'; end if;
end;
$$;

revoke all on function public.week7_loop_prediction_correct_option(text) from public, anon, authenticated;
revoke all on function public.week7_loop_signature_v3_valid(text,text) from public, anon, authenticated;
revoke all on function public.week7_loop_diagram_score_v3(text,text) from public, anon, authenticated;
revoke all on function public.week7_loop_repair_score_v3(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
grant execute on function public.week7_loop_prediction_correct_option(text) to service_role;
grant execute on function public.week7_loop_signature_v3_valid(text,text) to service_role;
grant execute on function public.week7_loop_diagram_score_v3(text,text) to service_role;
grant execute on function public.week7_loop_repair_score_v3(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
