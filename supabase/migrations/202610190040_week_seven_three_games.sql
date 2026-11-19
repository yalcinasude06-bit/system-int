-- Week 7: Sign the Loop, Stock Race, and Draw the Rest of the Graph.
-- Keeps legacy Week 7 Module 1 score routes intact and validates all new scores server-side.

create or replace function public.week7_loop_signs_expected(case_id text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'LS1' then array['+','+','+']::text[]
    when 'LS2' then array['-','+','+','+']::text[]
    when 'LS3' then array['-','+','+','+']::text[]
    when 'LS4' then array['+','+','+','+','-']::text[]
    when 'LS5' then array['+','-','+','-','+']::text[]
    else null
  end;
$$;

create or replace function public.week7_loop_signs_score_v4(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_ids constant text[] := array['LS1','LS2','LS3','LS4','LS5'];
  expected_loop_types constant text[] := array['R','B','B','B','R'];
  attempts jsonb := payload -> 'attempts';
  attempt jsonb;
  expected text[];
  sign_value text;
  attempt_index int := 0;
  correct_count int;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-7-loop-signs-v4'
    or jsonb_typeof(attempts) <> 'array'
    or jsonb_array_length(attempts) > 5 then return 0;
  end if;

  for attempt in select value from jsonb_array_elements(attempts) loop
    attempt_index := attempt_index + 1;
    expected := public.week7_loop_signs_expected(expected_ids[attempt_index]);
    if jsonb_typeof(attempt) <> 'object'
      or attempt ->> 'caseId' is distinct from expected_ids[attempt_index]
      or jsonb_typeof(attempt -> 'signs') <> 'array'
      or jsonb_array_length(attempt -> 'signs') <> cardinality(expected) then return 0;
    end if;
    if exists (
      select 1 from jsonb_array_elements_text(attempt -> 'signs') sign_item(value)
      where sign_item.value not in ('+','-')
    ) then return 0;
    end if;
    select count(*)::int into correct_count
    from jsonb_array_elements_text(attempt -> 'signs') with ordinality sign_item(value, position)
    where sign_item.value = expected[sign_item.position];

    if attempt_index = 5 then
      if attempt ->> 'loopType' is null or attempt ->> 'loopType' not in ('R','B') then return 0; end if;
      result := result + round(16.0 * correct_count / cardinality(expected))::int;
      if attempt ->> 'loopType' = expected_loop_types[attempt_index] then result := result + 4; end if;
    else
      sign_value := attempt ->> 'loopType';
      if sign_value is not null and sign_value not in ('R','B') then return 0; end if;
      result := result + round(20.0 * correct_count / cardinality(expected))::int;
    end if;
  end loop;
  return greatest(0, least(result, 100));
end;
$$;

create or replace function public.week7_stock_race_winner(round_id text)
returns text
language sql
immutable
set search_path = public
as $$
  select case round_id
    when 'SR1' then 'A'
    when 'SR2' then 'B'
    when 'SR3' then 'C'
    when 'SR4' then 'B'
    when 'SR5' then 'A'
    else null
  end;
$$;

create or replace function public.week7_stock_race_score_v1(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_ids constant text[] := array['SR1','SR2','SR3','SR4','SR5'];
  attempts jsonb := payload -> 'attempts';
  attempt jsonb;
  attempt_index int := 0;
  prediction text;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-7-stock-race-v1'
    or jsonb_typeof(attempts) <> 'array'
    or jsonb_array_length(attempts) > 5 then return 0;
  end if;
  for attempt in select value from jsonb_array_elements(attempts) loop
    attempt_index := attempt_index + 1;
    prediction := attempt ->> 'prediction';
    if jsonb_typeof(attempt) <> 'object'
      or attempt ->> 'roundId' is distinct from expected_ids[attempt_index]
      or prediction is null
      or prediction not in ('A','B','C')
      or (attempt_index = 1 and prediction = 'C') then return 0;
    end if;
    if prediction = public.week7_stock_race_winner(expected_ids[attempt_index]) then result := result + 20; end if;
  end loop;
  return greatest(0, least(result, 100));
end;
$$;

create or replace function public.week7_curve_target_value(round_id text, sample_index int)
returns double precision
language sql
immutable
set search_path = public
as $$
  select case round_id
    when 'DC1' then 0.38 + 0.38 * (sample_index / 31.0)
    when 'DC2' then 0.31 + 0.12 * (exp(1.5 * (sample_index / 31.0)) - 1)
    when 'DC3' then 0.39 + 0.43 * (1 - exp(-3 * (sample_index / 31.0)))
    when 'DC4' then 0.235 + 0.64 / (1 + exp(-6 * ((sample_index / 31.0) - 0.45)))
    when 'DC5' then 0.54 + 0.2 * exp(-0.75 * (sample_index / 31.0)) * sin(3.5 * pi() * (sample_index / 31.0))
    else null
  end;
$$;

create or replace function public.week7_curve_direction_changes(values_array double precision[])
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  item_index int;
  delta_value double precision;
  direction_value int;
  previous_direction int := 0;
  changes int := 0;
begin
  if coalesce(cardinality(values_array), 0) < 2 then return 0; end if;
  for item_index in 2..cardinality(values_array) loop
    delta_value := values_array[item_index] - values_array[item_index - 1];
    direction_value := case when abs(delta_value) < 0.008 then previous_direction when delta_value > 0 then 1 else -1 end;
    if previous_direction <> 0 and direction_value <> 0 and direction_value <> previous_direction then changes := changes + 1; end if;
    if direction_value <> 0 then previous_direction := direction_value; end if;
  end loop;
  return changes;
end;
$$;

create or replace function public.week7_curve_attempt_score(round_id text, points jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  student_values double precision[] := array[]::double precision[];
  target_values double precision[] := array[]::double precision[];
  point_item jsonb;
  position_index bigint;
  x_value double precision;
  y_value double precision;
  target_y double precision;
  mean_error double precision := 0;
  similarity int;
  trend_score int := 0;
  shape_score int := 0;
  target_delta double precision;
  student_delta double precision;
begin
  if round_id not in ('DC1','DC2','DC3','DC4','DC5')
    or jsonb_typeof(points) <> 'array'
    or jsonb_array_length(points) <> 32 then return 0;
  end if;

  for point_item, position_index in
    select value, ordinality from jsonb_array_elements(points) with ordinality
  loop
    if jsonb_typeof(point_item) <> 'object'
      or jsonb_typeof(point_item -> 'x') <> 'number'
      or jsonb_typeof(point_item -> 'y') <> 'number' then return 0;
    end if;
    x_value := (point_item ->> 'x')::double precision;
    y_value := (point_item ->> 'y')::double precision;
    if x_value < 0 or x_value > 1 or y_value < 0 or y_value > 1
      or abs(x_value - ((position_index - 1) / 31.0)) > 0.002 then return 0;
    end if;
    target_y := public.week7_curve_target_value(round_id, (position_index - 1)::int);
    student_values := array_append(student_values, y_value);
    target_values := array_append(target_values, target_y);
    mean_error := mean_error + abs(y_value - target_y);
  end loop;

  mean_error := mean_error / 32.0;
  similarity := round(14.0 * (1 - least(1.0, mean_error / 0.35)))::int;
  target_delta := target_values[32] - target_values[1];
  student_delta := student_values[32] - student_values[1];
  if (abs(target_delta) < 0.08 and abs(student_delta) < 0.25)
    or (abs(target_delta) >= 0.08 and sign(target_delta) = sign(student_delta)) then trend_score := 3;
  end if;
  if abs(public.week7_curve_direction_changes(student_values) - public.week7_curve_direction_changes(target_values)) <= 1 then shape_score := 3; end if;
  return greatest(0, least(similarity + trend_score + shape_score, 20));
exception when others then
  return 0;
end;
$$;

create or replace function public.week7_draw_curve_score_v1(payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_ids constant text[] := array['DC1','DC2','DC3','DC4','DC5'];
  attempts jsonb := payload -> 'attempts';
  attempt jsonb;
  attempt_index int := 0;
  result int := 0;
begin
  if payload ->> 'gameId' is distinct from 'week-7-draw-curve-v1'
    or jsonb_typeof(attempts) <> 'array'
    or jsonb_array_length(attempts) > 5 then return 0;
  end if;
  for attempt in select value from jsonb_array_elements(attempts) loop
    attempt_index := attempt_index + 1;
    if jsonb_typeof(attempt) <> 'object'
      or attempt ->> 'roundId' is distinct from expected_ids[attempt_index] then return 0;
    end if;
    result := result + public.week7_curve_attempt_score(expected_ids[attempt_index], attempt -> 'points');
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
    when target_week_id = 7 and target_module_id = 1 and new_payload ->> 'gameId' = 'week-7-loop-signs-v4' then public.week7_loop_signs_score_v4(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 1 then 0
    when target_week_id = 7 and target_module_id = 2 and new_payload ->> 'gameId' = 'week-7-stock-race-v1' then public.week7_stock_race_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 2 then 0
    when target_week_id = 7 and target_module_id = 3 and new_payload ->> 'gameId' = 'week-7-draw-curve-v1' then public.week7_draw_curve_score_v1(coalesce(new_payload, '{}'::jsonb))
    when target_week_id = 7 and target_module_id = 3 then 0
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
    or (target_session.selected_week in (3, 4, 5, 6, 7) and target_module_id > 3)
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

-- The latest product decision enables the existing accuracy-weighted speed bonus
-- for all three Week 7 modules. Remove the earlier Week 7/1 exclusion while
-- preserving the atomic finalizer and all other exclusions.
do $$
declare
  current_definition text;
  updated_definition text;
begin
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  updated_definition := regexp_replace(
    current_definition,
    '\s+or\s+\(target_session\.selected_week = 7\s+and\s+target_session\.current_module = 1\)',
    '',
    'i'
  );
  if updated_definition is distinct from current_definition then execute updated_definition; end if;
  current_definition := pg_get_functiondef('public.finish_session_module(uuid,bigint)'::regprocedure);
  if current_definition ~* 'target_session\.selected_week = 7\s+and\s+target_session\.current_module = 1' then
    raise exception 'Could not enable the Week 7 speed bonus';
  end if;
end;
$$;

do $$
declare
  loop_perfect jsonb := '{"gameId":"week-7-loop-signs-v4","attempts":[{"caseId":"LS1","signs":["+","+","+"],"loopType":null},{"caseId":"LS2","signs":["-","+","+","+"],"loopType":null},{"caseId":"LS3","signs":["-","+","+","+"],"loopType":null},{"caseId":"LS4","signs":["+","+","+","+","-"],"loopType":null},{"caseId":"LS5","signs":["+","-","+","-","+"],"loopType":"R"}]}'::jsonb;
  stock_perfect jsonb := '{"gameId":"week-7-stock-race-v1","attempts":[{"roundId":"SR1","prediction":"A"},{"roundId":"SR2","prediction":"B"},{"roundId":"SR3","prediction":"C"},{"roundId":"SR4","prediction":"B"},{"roundId":"SR5","prediction":"A"}]}'::jsonb;
  curve_attempts jsonb;
  curve_perfect jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'roundId', round_id,
    'points', (select jsonb_agg(jsonb_build_object('x', sample_index / 31.0, 'y', public.week7_curve_target_value(round_id, sample_index)) order by sample_index) from generate_series(0,31) sample_index)
  ) order by round_position)
  into curve_attempts
  from unnest(array['DC1','DC2','DC3','DC4','DC5']) with ordinality rounds(round_id, round_position);
  curve_perfect := jsonb_build_object('gameId','week-7-draw-curve-v1','attempts',curve_attempts);

  if public.week7_loop_signs_score_v4(loop_perfect) <> 100 then raise exception 'Week 7 loop signs perfect-score check failed'; end if;
  if public.week7_loop_signs_score_v4(jsonb_set(loop_perfect,'{attempts,4,loopType}','"B"')) <> 96 then raise exception 'Week 7 loop type score check failed'; end if;
  if public.week7_stock_race_score_v1(stock_perfect) <> 100 then raise exception 'Week 7 stock race perfect-score check failed'; end if;
  if public.week7_stock_race_score_v1(jsonb_set(stock_perfect,'{attempts,0,prediction}','"C"')) <> 0 then raise exception 'Week 7 stock race invalid tank check failed'; end if;
  if public.week7_draw_curve_score_v1(curve_perfect) <> 100 then raise exception 'Week 7 draw curve perfect-score check failed'; end if;
  if public.validated_module_score(7,1,loop_perfect,0) <> 100 then raise exception 'Week 7 Module 1 routing failed'; end if;
  if public.validated_module_score(7,2,stock_perfect,0) <> 100 then raise exception 'Week 7 Module 2 routing failed'; end if;
  if public.validated_module_score(7,3,curve_perfect,0) <> 100 then raise exception 'Week 7 Module 3 routing failed'; end if;
end;
$$;

revoke all on function public.week7_loop_signs_expected(text) from public, anon, authenticated;
revoke all on function public.week7_loop_signs_score_v4(jsonb) from public, anon, authenticated;
revoke all on function public.week7_stock_race_winner(text) from public, anon, authenticated;
revoke all on function public.week7_stock_race_score_v1(jsonb) from public, anon, authenticated;
revoke all on function public.week7_curve_target_value(text,int) from public, anon, authenticated;
revoke all on function public.week7_curve_direction_changes(double precision[]) from public, anon, authenticated;
revoke all on function public.week7_curve_attempt_score(text,jsonb) from public, anon, authenticated;
revoke all on function public.week7_draw_curve_score_v1(jsonb) from public, anon, authenticated;
revoke all on function public.validated_module_score(int,int,jsonb,int) from public, anon, authenticated;

grant execute on function public.week7_loop_signs_expected(text) to service_role;
grant execute on function public.week7_loop_signs_score_v4(jsonb) to service_role;
grant execute on function public.week7_stock_race_winner(text) to service_role;
grant execute on function public.week7_stock_race_score_v1(jsonb) to service_role;
grant execute on function public.week7_curve_target_value(text,int) to service_role;
grant execute on function public.week7_curve_direction_changes(double precision[]) to service_role;
grant execute on function public.week7_curve_attempt_score(text,jsonb) to service_role;
grant execute on function public.week7_draw_curve_score_v1(jsonb) to service_role;
grant execute on function public.validated_module_score(int,int,jsonb,int) to service_role;
