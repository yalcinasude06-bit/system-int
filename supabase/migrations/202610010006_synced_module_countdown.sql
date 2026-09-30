alter table public.sessions
  add column if not exists module_started_at timestamptz;

update public.sessions
set module_started_at = clock_timestamp() - interval '10 seconds'
where is_module_started = true
  and module_started_at is null;

comment on column public.sessions.module_started_at is
  'Database timestamp shared by every client for the synchronized module countdown.';

create or replace function public.start_session_module(
  target_session_id uuid,
  target_module_id int
)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_session public.sessions%rowtype;
begin
  update public.sessions
  set current_module = target_module_id,
      module_stage = 2,
      is_module_started = true,
      module_started_at = clock_timestamp(),
      fault_injected = false
  where id = target_session_id
    and is_active = true
  returning * into updated_session;

  if updated_session.id is null then
    raise exception 'Active session not found';
  end if;

  return updated_session;
end;
$$;

create or replace function public.cancel_session_module_start(target_session_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_session public.sessions%rowtype;
begin
  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 1,
      fault_injected = false
  where id = target_session_id
    and is_active = true
    and is_module_started = true
    and module_started_at is not null
    and module_started_at + interval '10 seconds' > clock_timestamp()
  returning * into updated_session;

  if updated_session.id is null then
    raise exception 'Countdown is no longer active';
  end if;

  return updated_session;
end;
$$;

revoke all on function public.start_session_module(uuid, int) from public;
revoke all on function public.cancel_session_module_start(uuid) from public;
grant execute on function public.start_session_module(uuid, int) to anon, authenticated;
grant execute on function public.cancel_session_module_start(uuid) to anon, authenticated;
