-- Keep the globally unique technical run number while exposing a separate,
-- per-session/week/module play count to teachers and students.

alter table public.sessions
  add column if not exists module_turn_counters jsonb not null default '{}'::jsonb
  check (jsonb_typeof(module_turn_counters) = 'object');

alter table public.sessions
  add column if not exists current_module_turn int not null default 0
  check (current_module_turn >= 0);

-- Reconstruct visible play counts once from persisted legacy/current results.
-- A cancelled countdown has no result/draft and therefore consumes no count.
with run_events as (
  select distinct session_id, week_id, module_id, run_number
  from public.submissions
  union
  select distinct session_id, week_id, module_id, run_number
  from public.module_drafts
  union
  select id, selected_week, current_module, current_run_number
  from public.sessions
  where current_run_number > 0
    and (is_module_started = true or module_stage >= 3)
), module_counts as (
  select session_id,
         format('%s:%s', week_id, module_id) as module_key,
         count(*)::int as turn_count
  from run_events
  group by session_id, week_id, module_id
), session_counters as (
  select session_id,
         jsonb_object_agg(module_key, to_jsonb(turn_count)) as counters
  from module_counts
  group by session_id
)
update public.sessions as target_session
set module_turn_counters = counters.counters
from session_counters counters
where target_session.id = counters.session_id;

update public.sessions
set current_module_turn = coalesce(
  (module_turn_counters ->> format('%s:%s', selected_week, current_module))::int,
  0
);

comment on column public.sessions.module_turn_counters is
  'Visible play counts keyed by week:module. Technical run_number remains globally unique.';
comment on column public.sessions.current_module_turn is
  'Visible 1-based play count for the selected week/module; zero means not played yet.';

create or replace function public.sync_session_current_module_turn()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.selected_week is distinct from old.selected_week
    or new.current_module is distinct from old.current_module then
    new.current_module_turn := coalesce(
      (new.module_turn_counters ->> format('%s:%s', new.selected_week, new.current_module))::int,
      0
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sessions_sync_current_module_turn on public.sessions;
create trigger sessions_sync_current_module_turn
before update of selected_week, current_module on public.sessions
for each row execute function public.sync_session_current_module_turn();

revoke all on function public.sync_session_current_module_turn() from public, anon, authenticated;

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
    or (target_session.selected_week in (3, 4) and target_module_id > 3)
    or (target_session.selected_week not in (1, 3, 4)) then
    raise exception 'Invalid module selection';
  end if;

  module_key := format('%s:%s', target_session.selected_week, target_module_id);
  next_module_turn := coalesce((target_session.module_turn_counters ->> module_key)::int, 0) + 1;

  update public.sessions
  set current_run_number = current_run_number + 1,
      current_module = target_module_id,
      current_module_turn = next_module_turn,
      module_turn_counters = jsonb_set(
        coalesce(module_turn_counters, '{}'::jsonb),
        array[module_key],
        to_jsonb(next_module_turn),
        true
      ),
      module_stage = 2,
      is_module_started = true,
      module_started_at = clock_timestamp(),
      fault_injected = false
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

create or replace function public.cancel_session_module_start(
  target_session_id uuid,
  expected_run_number bigint
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  updated_session public.sessions%rowtype;
  module_key text;
  restored_module_turn int;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

  if target_session.id is null or not target_session.is_active then
    raise exception 'Active session not found';
  end if;
  if target_session.current_run_number <> expected_run_number then
    raise exception 'Stale module round';
  end if;
  if not target_session.is_module_started
    or target_session.module_started_at is null
    or target_session.module_started_at + interval '10 seconds' <= clock_timestamp() then
    raise exception 'Countdown is no longer active';
  end if;

  module_key := format('%s:%s', target_session.selected_week, target_session.current_module);
  restored_module_turn := greatest(target_session.current_module_turn - 1, 0);

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 1,
      current_module_turn = restored_module_turn,
      module_turn_counters = jsonb_set(
        coalesce(module_turn_counters, '{}'::jsonb),
        array[module_key],
        to_jsonb(restored_module_turn),
        true
      ),
      fault_injected = false
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

-- Serialize a student's drafts with their final submission. This keeps a late
-- draft from being inserted after submit_module_once has already deleted it.
create or replace function public.save_module_draft(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  expected_run_number bigint,
  target_stage int,
  new_payload jsonb,
  new_score int,
  new_answered_count int,
  new_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for share;

  if target_session.id is null or not target_session.is_active then
    raise exception 'Session is not active';
  end if;
  if not target_session.is_module_started
    or target_session.selected_week <> target_week_id
    or target_session.current_module <> target_module_id
    or target_session.current_run_number <> expected_run_number then
    return jsonb_build_object('saved', false, 'reason', 'module-closed-or-stale');
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id
  for update;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  if exists (
    select 1 from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number
      and is_submitted = true
  ) then
    delete from public.module_drafts
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and run_number = expected_run_number;
    return jsonb_build_object('saved', false, 'reason', 'already-submitted');
  end if;

  insert into public.module_drafts (
    session_id, student_id, student_number, week_id, module_id, run_number,
    stage, payload, score, answered_count, revision, updated_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, expected_run_number,
    greatest(coalesce(target_stage, 1), 1), coalesce(new_payload, '{}'::jsonb),
    greatest(0, least(coalesce(new_score, 0), public.module_score_cap(target_week_id, target_module_id))),
    greatest(0, coalesce(new_answered_count, 0)), greatest(0, coalesce(new_revision, 0)),
    timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id, run_number) do update
  set student_id = excluded.student_id,
      stage = excluded.stage,
      payload = excluded.payload,
      score = excluded.score,
      answered_count = excluded.answered_count,
      revision = excluded.revision,
      updated_at = excluded.updated_at
  where excluded.revision >= module_drafts.revision;

  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.get_student_session_status(
  target_pin text,
  target_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
begin
  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''));
  if target_session.id is null then raise exception 'Session was not found'; end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session.id;
  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', target_session.id,
      'pin_code', target_session.pin_code,
      'title', target_session.title,
      'selected_week', target_session.selected_week,
      'current_module', target_session.current_module,
      'current_run_number', target_session.current_run_number,
      'current_module_turn', target_session.current_module_turn,
      'module_turn_counters', target_session.module_turn_counters,
      'module_stage', target_session.module_stage,
      'is_module_started', target_session.is_module_started,
      'module_started_at', target_session.module_started_at,
      'is_active', target_session.is_active,
      'fault_injected', target_session.fault_injected,
      'created_at', target_session.created_at
    ),
    'student', jsonb_build_object(
      'id', target_student.id,
      'score', target_student.score,
      'session_score', target_student.session_score,
      'last_active', target_student.last_active
    )
  );
end;
$$;

revoke all on function public.start_session_module(uuid, int) from public, anon, authenticated;
grant execute on function public.start_session_module(uuid, int) to service_role;

revoke all on function public.cancel_session_module_start(uuid, bigint) from public, anon, authenticated;
grant execute on function public.cancel_session_module_start(uuid, bigint) to service_role;

revoke all on function public.save_module_draft(uuid, uuid, int, int, bigint, int, jsonb, int, int, bigint) from public;
grant execute on function public.save_module_draft(uuid, uuid, int, int, bigint, int, jsonb, int, int, bigint) to anon, authenticated;

revoke all on function public.get_student_session_status(text, uuid) from public;
grant execute on function public.get_student_session_status(text, uuid) to anon, authenticated;
