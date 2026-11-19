-- Week 8: Crisis Meeting and Evidence Market.
-- Scores are reconstructed from payloads; claimed client scores are ignored.

create or replace function public.week8_crisis_ideal(case_id text)
returns int[] language sql immutable set search_path = public as $$
  select case case_id
    when 'CM1' then array[0,0,2,1]
    when 'CM2' then array[0,1,0,2]
    when 'CM3' then array[0,2,1,0]
    when 'CM4' then array[0,1,1,1]
    when 'CM5' then array[0,2,1,0]
    else null
  end;
$$;

create or replace function public.week8_crisis_meeting_score_v1(payload jsonb)
returns int language plpgsql immutable set search_path = public as $$
declare
  expected_ids constant text[] := array['CM1','CM2','CM3','CM4','CM5'];
  attempts jsonb := payload -> 'attempts'; attempt jsonb; allocation jsonb; ideal int[];
  attempt_index int := 0; item_index int; token_total int; difference int; distance int; result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-8-crisis-meeting-v1'
    or jsonb_typeof(attempts) <> 'array' or jsonb_array_length(attempts) > 5 then return 0; end if;
  for attempt in select value from jsonb_array_elements(attempts) loop
    attempt_index := attempt_index + 1; allocation := attempt -> 'allocation'; ideal := public.week8_crisis_ideal(expected_ids[attempt_index]);
    if jsonb_typeof(attempt) <> 'object' or attempt ->> 'caseId' is distinct from expected_ids[attempt_index]
      or jsonb_typeof(allocation) <> 'array' or jsonb_array_length(allocation) <> 4 then return 0; end if;
    token_total := 0; difference := 0;
    for item_index in 0..3 loop
      if jsonb_typeof(allocation -> item_index) <> 'number'
        or (allocation ->> item_index)::numeric <> trunc((allocation ->> item_index)::numeric)
        or (allocation ->> item_index)::int < 0 or (allocation ->> item_index)::int > 3 then return 0; end if;
      token_total := token_total + (allocation ->> item_index)::int;
      difference := difference + abs((allocation ->> item_index)::int - ideal[item_index + 1]);
    end loop;
    if token_total <> 3 then return 0; end if;
    distance := difference / 2;
    result := result + case distance when 0 then 20 when 1 then 16 when 2 then 12 when 3 then 8 else 4 end;
  end loop;
  return greatest(0, least(result, 100));
exception when others then return 0;
end;
$$;

create or replace function public.week8_evidence_cost(case_id text, evidence_id text)
returns int language sql immutable set search_path = public as $$
  select case case_id || ':' || evidence_id
    when 'EM1:density' then 25 when 'EM1:route' then 30 when 'EM1:forklift' then 20 when 'EM1:canteen' then 10 when 'EM1:shift' then 20
    when 'EM2:complaints' then 20 when 'EM2:observation' then 20 when 'EM2:electricity' then 15 when 'EM2:brochure' then 10 when 'EM2:training' then 20
    when 'EM3:variance' then 30 when 'EM3:dependency' then 25 when 'EM3:poster' then 10 when 'EM3:quality' then 20 when 'EM3:stock' then 20
    when 'EM4:versions' then 20 when 'EM4:manual' then 20 when 'EM4:temperature' then 10 when 'EM4:meetings' then 15 when 'EM4:overtime' then 15
    when 'EM5:timeline' then 20 when 'EM5:skills' then 25 when 'EM5:parking' then 10 when 'EM5:price' then 15 when 'EM5:pilot' then 20
    else null
  end;
$$;

create or replace function public.week8_evidence_market_score_v1(payload jsonb)
returns int language plpgsql immutable set search_path = public as $$
declare
  expected_ids constant text[] := array['EM1','EM2','EM3','EM4','EM5'];
  correct_solutions constant text[] := array['layout','standard','dual','single','prepare'];
  required_one constant text[] := array['density','complaints','variance','versions','skills'];
  required_two constant text[] := array['route','training','dependency','manual','pilot'];
  attempts jsonb := payload -> 'attempts'; attempt jsonb; opened jsonb; evidence_item text;
  attempt_index int := 0; spent int; evidence_cost int; opened_count int; result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-8-evidence-market-v1'
    or jsonb_typeof(attempts) <> 'array' or jsonb_array_length(attempts) > 5 then return 0; end if;
  for attempt in select value from jsonb_array_elements(attempts) loop
    attempt_index := attempt_index + 1; opened := attempt -> 'opened';
    if jsonb_typeof(attempt) <> 'object' or attempt ->> 'caseId' is distinct from expected_ids[attempt_index]
      or jsonb_typeof(opened) <> 'array' or jsonb_array_length(opened) < 2 or jsonb_array_length(opened) > 5 then return 0; end if;
    if (select count(*) from jsonb_array_elements_text(opened)) <> (select count(distinct value) from jsonb_array_elements_text(opened)) then return 0; end if;
    spent := 0; opened_count := 0;
    for evidence_item in select value from jsonb_array_elements_text(opened) loop
      evidence_cost := public.week8_evidence_cost(expected_ids[attempt_index], evidence_item);
      if evidence_cost is null then return 0; end if;
      spent := spent + evidence_cost;
      if evidence_item in (required_one[attempt_index], required_two[attempt_index]) then opened_count := opened_count + 1; end if;
    end loop;
    if spent > 100 then return 0; end if;
    if attempt ->> 'solutionId' is null then return 0; end if;
    if attempt ->> 'solutionId' = correct_solutions[attempt_index] then result := result + 12; end if;
    result := result + opened_count * 3;
    if spent <= 70 then result := result + 2; end if;
  end loop;
  return greatest(0, least(result, 100));
exception when others then return 0;
end;
$$;

create or replace function public.validated_module_score(target_week_id int, target_module_id int, new_payload jsonb, claimed_score int)
returns int language sql immutable set search_path = public as $$
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
    when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-signs-v4' then public.week7_loop_signs_score_v4(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 1 then 0
    when target_week_id = 7 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-7-stock-race-v1' then public.week7_stock_race_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 2 then 0
    when target_week_id = 7 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-7-draw-curve-v1' then public.week7_draw_curve_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 3 then 0
    when target_week_id = 8 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-8-crisis-meeting-v1' then public.week8_crisis_meeting_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 8 and target_module_id = 1 then 0
    when target_week_id = 8 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-8-evidence-market-v1' then public.week8_evidence_market_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 8 and target_module_id = 2 then 0
    else greatest(0, least(coalesce(claimed_score, 0), public.module_score_cap(target_week_id, target_module_id)))
  end;
$$;

create or replace function public.start_session_module(target_session_id uuid, target_module_id int)
returns public.sessions language plpgsql security definer set search_path = public as $$
declare target_session public.sessions%rowtype; updated_session public.sessions%rowtype; module_key text; next_module_turn int;
begin
  select * into target_session from public.sessions where id = target_session_id for update;
  if target_session.id is null or not target_session.is_active then raise exception 'Active session not found'; end if;
  if target_session.is_module_started then raise exception 'A module round is already active'; end if;
  if target_module_id < 1
    or (target_session.selected_week = 1 and target_module_id > 5)
    or (target_session.selected_week in (3,4,5,6,7) and target_module_id > 3)
    or (target_session.selected_week = 8 and target_module_id > 2)
    or (target_session.selected_week not in (1,3,4,5,6,7,8)) then raise exception 'Invalid module selection'; end if;
  module_key := format('%s:%s', target_session.selected_week, target_module_id);
  next_module_turn := coalesce((target_session.module_turn_counters ->> module_key)::int, 0) + 1;
  update public.sessions set current_run_number = current_run_number + 1, current_module = target_module_id, current_module_turn = next_module_turn,
    module_turn_counters = jsonb_set(coalesce(module_turn_counters,'{}'::jsonb),array[module_key],to_jsonb(next_module_turn),true), module_stage = 2,
    is_module_started = true, module_started_at = clock_timestamp(), fault_injected = false where id = target_session.id returning * into updated_session;
  return updated_session;
end;
$$;

do $$
declare
  crisis jsonb := '{"gameId":"week-8-crisis-meeting-v1","attempts":[{"caseId":"CM1","allocation":[0,0,2,1]},{"caseId":"CM2","allocation":[0,1,0,2]},{"caseId":"CM3","allocation":[0,2,1,0]},{"caseId":"CM4","allocation":[0,1,1,1]},{"caseId":"CM5","allocation":[0,2,1,0]}]}'::jsonb;
  evidence jsonb := '{"gameId":"week-8-evidence-market-v1","attempts":[{"caseId":"EM1","opened":["density","route"],"solutionId":"layout"},{"caseId":"EM2","opened":["complaints","training"],"solutionId":"standard"},{"caseId":"EM3","opened":["variance","dependency"],"solutionId":"dual"},{"caseId":"EM4","opened":["versions","manual"],"solutionId":"single"},{"caseId":"EM5","opened":["skills","pilot"],"solutionId":"prepare"}]}'::jsonb;
begin
  if public.week8_crisis_meeting_score_v1(crisis) <> 100 then raise exception 'Week 8 crisis perfect-score check failed'; end if;
  if public.week8_evidence_market_score_v1(evidence) <> 100 then raise exception 'Week 8 evidence perfect-score check failed'; end if;
  if public.validated_module_score(8,1,crisis,0) <> 100 then raise exception 'Week 8 Module 1 routing failed'; end if;
  if public.validated_module_score(8,2,evidence,0) <> 100 then raise exception 'Week 8 Module 2 routing failed'; end if;
  if pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure) ~* 'selected_week\s*=\s*8' then raise exception 'Week 8 speed bonus must remain enabled'; end if;
end;
$$;

revoke all on function public.week8_crisis_ideal(text) from public, anon, authenticated;
revoke all on function public.week8_crisis_meeting_score_v1(jsonb) from public, anon, authenticated;
revoke all on function public.week8_evidence_cost(text,text) from public, anon, authenticated;
revoke all on function public.week8_evidence_market_score_v1(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;
grant execute on function public.week8_crisis_ideal(text) to service_role;
grant execute on function public.week8_crisis_meeting_score_v1(jsonb) to service_role;
grant execute on function public.week8_evidence_cost(text,text) to service_role;
grant execute on function public.week8_evidence_market_score_v1(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
