-- Enable the three Week 6 modules without widening client table access.
-- Week 6 scores are recomputed from a fixed task-id answer key, so a client
-- supplied score or `isCorrect` flag is never trusted.

create or replace function public.week6_task_correct_index(target_module_id int, task_id text)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  task_number int;
  encoded_answer int;
begin
  if task_id !~ '^W6[FRA](0[1-9]|[12][0-9]|30)-[0-3]$' then
    return null;
  end if;
  task_number := substring(task_id from 4 for 2)::int;
  encoded_answer := right(task_id, 1)::int;

  if target_module_id = 1 and substring(task_id from 3 for 1) = 'F'
    and task_number between 1 and 30 and encoded_answer = mod(task_number - 1, 4) then
    return encoded_answer;
  elsif target_module_id = 2 and substring(task_id from 3 for 1) = 'R'
    and task_number between 1 and 24 and encoded_answer = mod(task_number - 1, 4) then
    return encoded_answer;
  elsif target_module_id = 3 and substring(task_id from 3 for 1) = 'A'
    and task_number between 1 and 24
    and encoded_answer = (case
      when task_number between 1 and 6 then 0
      when task_number between 7 and 12 then 1
      when task_number between 13 and 18 then 2
      else 3
    end) then
    return encoded_answer;
  end if;
  return null;
end;
$$;

create or replace function public.week6_module_score(target_module_id int, payload jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  selected jsonb := coalesce(payload, '{}'::jsonb) -> 'selectedTaskIds';
  answers jsonb := coalesce(payload, '{}'::jsonb) -> 'answers';
  answer jsonb;
  ordinal bigint;
  task_id text;
  selected_index int;
  correct_index int;
  expected_game_id text := case target_module_id
    when 1 then 'week-6-flow-v1'
    when 2 then 'week-6-repair-v1'
    when 3 then 'week-6-agency-v1'
    else null
  end;
  result int := 0;
begin
  if expected_game_id is null
    or payload ->> 'gameId' is distinct from expected_game_id
    or jsonb_typeof(selected) <> 'array'
    or jsonb_typeof(answers) <> 'array'
    or jsonb_array_length(selected) <> 5 then
    return 0;
  end if;

  if (select count(distinct value) from jsonb_array_elements_text(selected)) <> 5 then
    return 0;
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(selected) item
    where public.week6_task_correct_index(target_module_id, item) is null
  ) then
    return 0;
  end if;

  for answer, ordinal in
    select value, ordinality from jsonb_array_elements(answers) with ordinality
  loop
    if ordinal > 5 or jsonb_typeof(answer) <> 'object' then
      continue;
    end if;
    task_id := answer ->> 'taskId';
    if task_id is distinct from selected ->> (ordinal::int - 1) then
      continue;
    end if;
    correct_index := public.week6_task_correct_index(target_module_id, task_id);
    selected_index := case when coalesce(answer ->> 'selectedIndex', '') ~ '^[0-3]$' then (answer ->> 'selectedIndex')::int else -1 end;
    if correct_index is not null and selected_index = correct_index then
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
    when target_week_id = 6 and target_module_id between 1 and 3
      then public.week6_module_score(target_module_id, coalesce(new_payload, '{}'::jsonb))
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

revoke all on function public.week6_task_correct_index(int, text) from public, anon, authenticated;
revoke all on function public.week6_module_score(int, jsonb) from public, anon, authenticated;
revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
grant execute on function public.week6_task_correct_index(int, text) to service_role;
grant execute on function public.week6_module_score(int, jsonb) to service_role;
grant execute on function public.start_session_module(uuid, int) to service_role;
