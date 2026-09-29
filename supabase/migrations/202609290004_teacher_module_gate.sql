alter table public.sessions
  add column if not exists is_module_started boolean default false;

update public.sessions
set is_module_started = false
where is_module_started is null;

alter table public.sessions
  alter column is_module_started set default false,
  alter column is_module_started set not null;

comment on column public.sessions.is_module_started is
  'True only while the teacher has opened the selected module for student interaction.';

create or replace function public.submit_module_once(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
  target_stage int,
  new_payload jsonb,
  new_score int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
  created_submission public.submissions%rowtype;
  existing_submission public.submissions%rowtype;
  bounded_score int := greatest(0, least(coalesce(new_score, 0), 100));
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
    or target_session.current_module <> target_module_id then
    raise exception 'Module is not open for submissions';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id
  for update;

  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, is_submitted, updated_at, submitted_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, greatest(target_stage, 1),
    coalesce(new_payload, '{}'::jsonb), bounded_score, true,
    timezone('utc', now()), timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id) do nothing
  returning * into created_submission;

  if created_submission.id is null then
    select * into existing_submission
    from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id;

    return jsonb_build_object('submission', to_jsonb(existing_submission), 'was_new', false);
  end if;

  update public.students
  set session_score = session_score + bounded_score,
      score = session_score + bounded_score,
      last_active = timezone('utc', now())
  where id = target_student_id;

  insert into public.student_profiles (student_number, full_name, total_score, last_seen)
  values (target_student.student_number, target_student.nickname, bounded_score, timezone('utc', now()))
  on conflict (student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

grant execute on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int)
  to anon, authenticated;
