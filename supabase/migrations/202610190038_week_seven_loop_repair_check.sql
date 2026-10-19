-- Week 7 Module 1 v2: explicit Check flow and trusted scoring for correct and incorrect attempts.
-- This migration changes functions only; it does not broaden table, RLS, Realtime, or client access.

create or replace function public.week7_loop_attempt_signature_valid(case_id text, signature text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_signature text := public.week7_loop_case_signature(case_id);
  expected_parts text[];
  actual_parts text[];
  expected_part text;
  actual_part text;
  expected_edge text;
  actual_edge text;
  ordinal int;
begin
  if expected_signature is null or signature is null then return false; end if;
  expected_parts := string_to_array(expected_signature, '|');
  actual_parts := string_to_array(signature, '|');
  if cardinality(actual_parts) <> cardinality(expected_parts) then return false; end if;

  for ordinal in 1..cardinality(expected_parts) loop
    expected_part := expected_parts[ordinal];
    actual_part := actual_parts[ordinal];
    if actual_part !~ '^[^:|]+:[^:>|]+>[^:>|]+:[+-]$'
      or split_part(actual_part, ':', 1) is distinct from split_part(expected_part, ':', 1) then return false;
    end if;

    expected_edge := split_part(expected_part, ':', 2);
    actual_edge := split_part(actual_part, ':', 2);
    if not (
      (split_part(actual_edge, '>', 1) = split_part(expected_edge, '>', 1)
        and split_part(actual_edge, '>', 2) = split_part(expected_edge, '>', 2))
      or
      (split_part(actual_edge, '>', 1) = split_part(expected_edge, '>', 2)
        and split_part(actual_edge, '>', 2) = split_part(expected_edge, '>', 1))
    ) then return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.week7_loop_repair_score_v2(payload jsonb)
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
  result int := 0;
begin
  if coalesce(payload, '{}'::jsonb) ->> 'gameId' is distinct from 'week-7-loop-repair-v2'
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
    if jsonb_typeof(attempt) is distinct from 'object'
      or attempt ->> 'caseId' is distinct from case_id
      or not public.week7_loop_attempt_signature_valid(case_id, signature) then return 0;
    end if;
    if signature = public.week7_loop_case_signature(case_id) then result := result + 20; end if;
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
    when target_week_id = 7 and target_module_id = 1 then 0
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

do $$
declare
  perfect_v1 jsonb := '{"gameId":"week-7-loop-repair-v1","selectedCaseIds":["W01","P01","M01","B01","U01"],"completions":[{"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-"},{"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:+|e5:adults>births:+"},{"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:+|e5:budget>ads:+"},{"caseId":"B01","signature":"e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:-"},{"caseId":"U01","signature":"e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:+|e4:production>inventory:+"}]}'::jsonb;
  perfect_v2 jsonb := '{"gameId":"week-7-loop-repair-v2","selectedCaseIds":["W01","P01","M01","B01","U01"],"attempts":[{"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:tap>inflow:+|e4:inflow>level:+|e5:level>gap:-"},{"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:-|e4:maturation>adults:+|e5:adults>births:+"},{"caseId":"M01","signature":"e1:ads>awareness:+|e2:awareness>demand:+|e3:demand>revenue:+|e4:revenue>budget:+|e5:budget>ads:+"},{"caseId":"B01","signature":"e1:temperature>evaporation:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:-"},{"caseId":"U01","signature":"e1:inventory>gap:-|e2:gap>plan:+|e3:plan>production:+|e4:production>inventory:+"}]}'::jsonb;
  wrong_v2 jsonb := '{"gameId":"week-7-loop-repair-v2","selectedCaseIds":["W01","P01","M01","B01","U01"],"attempts":[{"caseId":"W01","signature":"e1:target>gap:+|e2:gap>tap:+|e3:inflow>tap:+|e4:inflow>level:+|e5:level>gap:+"},{"caseId":"P01","signature":"e1:births>children:+|e2:children>maturation:+|e3:maturation>children:+|e4:adults>maturation:+|e5:adults>births:+"},{"caseId":"M01","signature":"e1:ads>awareness:+|e2:demand>awareness:+|e3:demand>revenue:+|e4:revenue>budget:-|e5:budget>ads:+"},{"caseId":"B01","signature":"e1:evaporation>temperature:+|e2:evaporation>moisture:+|e3:moisture>cover:+|e4:cover>temperature:+"},{"caseId":"U01","signature":"e1:inventory>gap:+|e2:gap>plan:+|e3:production>plan:+|e4:production>inventory:+"}]}'::jsonb;
  mixed_v2 jsonb;
begin
  if public.week7_loop_repair_score_v2(perfect_v2) <> 100 then raise exception 'Loop Repair v2 perfect-score smoke test failed'; end if;
  if public.week7_loop_repair_score_v2(wrong_v2) <> 0 then raise exception 'Loop Repair v2 wrong-completion smoke test failed'; end if;
  mixed_v2 := jsonb_set(jsonb_set(wrong_v2, '{attempts,0}', perfect_v2 -> 'attempts' -> 0), '{attempts,1}', perfect_v2 -> 'attempts' -> 1);
  if public.week7_loop_repair_score_v2(mixed_v2) <> 40 then raise exception 'Loop Repair v2 mixed-score smoke test failed'; end if;
  if public.week7_loop_repair_score_v2(jsonb_set(perfect_v2, '{attempts,0,signature}', '"e1:forged>gap:+"'::jsonb)) <> 0 then raise exception 'Loop Repair v2 must reject forged endpoints'; end if;
  if public.week7_loop_repair_score_v2(jsonb_set(perfect_v2, '{selectedCaseIds,1}', '"W02"'::jsonb)) <> 0 then raise exception 'Loop Repair v2 must reject duplicate groups'; end if;
  if public.validated_module_score(7, 1, perfect_v1, 999) <> 100 then raise exception 'Loop Repair v1 backward-compatible routing failed'; end if;
  if public.validated_module_score(7, 1, perfect_v2, 999) <> 100 then raise exception 'Loop Repair v2 validated score routing failed'; end if;
end;
$$;

revoke all on function public.week7_loop_attempt_signature_valid(text,text) from public, anon, authenticated;
revoke all on function public.week7_loop_repair_score_v2(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
grant execute on function public.week7_loop_attempt_signature_valid(text,text) to service_role;
grant execute on function public.week7_loop_repair_score_v2(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
