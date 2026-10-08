-- Persist in-progress module work so ending a module never has to wait for browsers.
create table if not exists public.module_drafts (
  session_id uuid references public.sessions(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  student_number text not null,
  week_id int not null check (week_id > 0),
  module_id int not null check (module_id between 1 and 5),
  stage int not null default 1 check (stage > 0),
  payload jsonb not null default '{}'::jsonb,
  score int not null default 0 check (score between 0 and 100),
  answered_count int not null default 0 check (answered_count >= 0),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (session_id, student_number, week_id, module_id)
);

create index if not exists module_drafts_student_idx
  on public.module_drafts(student_id, week_id, module_id);

alter table public.module_drafts enable row level security;
revoke all on table public.module_drafts from anon, authenticated;

create or replace function public.save_module_draft(
  target_session_id uuid,
  target_student_id uuid,
  target_week_id int,
  target_module_id int,
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
  -- Shared locks allow all students to save concurrently while serializing with
  -- the teacher's exclusive finish lock.
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
    return jsonb_build_object('saved', false, 'reason', 'module-closed');
  end if;

  select * into target_student
  from public.students
  where id = target_student_id and session_id = target_session_id;
  if target_student.id is null then raise exception 'Student does not belong to this session'; end if;

  if exists (
    select 1 from public.submissions
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id
      and is_submitted = true
  ) then
    delete from public.module_drafts
    where session_id = target_session_id
      and student_number = target_student.student_number
      and week_id = target_week_id
      and module_id = target_module_id;
    return jsonb_build_object('saved', false, 'reason', 'already-submitted');
  end if;

  insert into public.module_drafts (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, answered_count, revision, updated_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, greatest(coalesce(target_stage, 1), 1),
    coalesce(new_payload, '{}'::jsonb),
    greatest(0, least(coalesce(new_score, 0), 100)),
    greatest(0, coalesce(new_answered_count, 0)),
    greatest(0, coalesce(new_revision, 0)),
    timezone('utc', now())
  )
  on conflict (session_id, student_number, week_id, module_id) do update
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

revoke all on function public.save_module_draft(uuid, uuid, int, int, int, jsonb, int, int, bigint) from public;
grant execute on function public.save_module_draft(uuid, uuid, int, int, int, jsonb, int, int, bigint)
  to anon, authenticated;

create or replace function public.finish_session_module(target_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  updated_session public.sessions%rowtype;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

  if target_session.id is null or not target_session.is_active then raise exception 'Session is not active'; end if;
  if not target_session.is_module_started then raise exception 'Module is not open'; end if;

  -- Turn each saved draft into one incomplete final submission. Completed
  -- submissions win through the existing unique key.
  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
  )
  select draft.session_id,
         draft.student_id,
         draft.student_number,
         draft.week_id,
         draft.module_id,
         draft.stage,
         coalesce(draft.payload, '{}'::jsonb) || jsonb_build_object(
           'completionReason', 'teacher-ended',
           'answeredCount', draft.answered_count,
           'autoFinalized', true,
           'fromDraft', true
         ),
         greatest(0, least(draft.score, 100)),
         0,
         true,
         'incomplete',
         timezone('utc', now()),
         timezone('utc', now())
  from public.module_drafts draft
  where draft.session_id = target_session.id
    and draft.week_id = target_session.selected_week
    and draft.module_id = target_session.current_module
  on conflict (session_id, student_number, week_id, module_id) do nothing;

  -- Students without a draft still receive a deterministic zero-point result.
  insert into public.submissions (
    session_id, student_id, student_number, week_id, module_id, stage,
    payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
  )
  select target_session.id,
         student.id,
         student.student_number,
         target_session.selected_week,
         target_session.current_module,
         greatest(target_session.module_stage, 1),
         jsonb_build_object(
           'completionReason', 'teacher-ended',
           'answeredCount', 0,
           'autoFinalized', true,
           'fromDraft', false
         ),
         0,
         0,
         true,
         'incomplete',
         timezone('utc', now()),
         timezone('utc', now())
  from public.students student
  where student.session_id = target_session.id
  on conflict (session_id, student_number, week_id, module_id) do nothing;

  -- Recompute affected totals so the operation is idempotent and draft scores
  -- are reflected without one request per student.
  update public.students student
  set session_score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        where answer.session_id = target_session.id
          and answer.student_number = student.student_number
          and answer.is_submitted = true
      ), 0),
      score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        where answer.session_id = target_session.id
          and answer.student_number = student.student_number
          and answer.is_submitted = true
      ), 0),
      last_active = timezone('utc', now())
  where student.session_id = target_session.id;

  update public.student_profiles profile
  set total_score = coalesce((
        select sum(answer.score + answer.speed_bonus)::int
        from public.submissions answer
        join public.sessions answer_session on answer_session.id = answer.session_id
        where answer_session.teacher_username = target_session.teacher_username
          and answer.student_number = profile.student_number
          and answer.is_submitted = true
      ), 0),
      last_seen = timezone('utc', now())
  where profile.teacher_username = target_session.teacher_username
    and profile.student_number in (
      select student.student_number
      from public.students student
      where student.session_id = target_session.id
    );

  delete from public.module_drafts
  where session_id = target_session.id
    and week_id = target_session.selected_week
    and module_id = target_session.current_module;

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 3
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

revoke all on function public.finish_session_module(uuid) from public;
revoke all on function public.finish_session_module(uuid) from anon, authenticated;
grant execute on function public.finish_session_module(uuid) to service_role;
