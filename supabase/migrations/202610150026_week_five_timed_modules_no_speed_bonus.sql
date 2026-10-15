-- Timed Week 5 games are scored only by their own validated 0-100 engines.
-- This is intentionally forward-only: it changes how an open run is finalized
-- and does not rewrite any historical submission or profile score.

create or replace function public.finish_session_module(
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
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

  if target_session.id is null or not target_session.is_active then
    raise exception 'Session is not active';
  end if;
  if target_session.current_run_number <> expected_run_number then
    raise exception 'Stale module round';
  end if;
  if not target_session.is_module_started then
    if target_session.module_stage >= 3 then
      return target_session;
    end if;
    raise exception 'Module is not open';
  end if;

  with candidates as (
    select draft.session_id,
           draft.student_id,
           draft.student_number,
           draft.week_id,
           draft.module_id,
           draft.run_number,
           draft.stage,
           coalesce(draft.payload, '{}'::jsonb) || jsonb_build_object(
             'completionReason', 'teacher-ended',
             'answeredCount', draft.answered_count,
             'autoFinalized', true,
             'fromDraft', true
           ) as payload,
           public.validated_module_score(draft.week_id, draft.module_id, draft.payload, draft.score) as score
    from public.module_drafts draft
    where draft.session_id = target_session.id
      and draft.week_id = target_session.selected_week
      and draft.module_id = target_session.current_module
      and draft.run_number = target_session.current_run_number

    union all

    select target_session.id,
           student.id,
           student.student_number,
           target_session.selected_week,
           target_session.current_module,
           target_session.current_run_number,
           greatest(target_session.module_stage, 1),
           jsonb_build_object(
             'completionReason', 'teacher-ended',
             'answeredCount', 0,
             'autoFinalized', true,
             'fromDraft', false
           ),
           0
    from public.students student
    where student.session_id = target_session.id
      and not exists (
        select 1 from public.module_drafts draft
        where draft.session_id = target_session.id
          and draft.student_number = student.student_number
          and draft.week_id = target_session.selected_week
          and draft.module_id = target_session.current_module
          and draft.run_number = target_session.current_run_number
      )
  ), inserted as (
    insert into public.submissions (
      session_id, student_id, student_number, week_id, module_id, run_number,
      stage, payload, score, speed_bonus, is_submitted, completion_status, updated_at, submitted_at
    )
    select candidate.session_id,
           candidate.student_id,
           candidate.student_number,
           candidate.week_id,
           candidate.module_id,
           candidate.run_number,
           candidate.stage,
           candidate.payload,
           candidate.score,
           0,
           true,
           'incomplete',
           timezone('utc', now()),
           timezone('utc', now())
    from candidates candidate
    on conflict (session_id, student_number, week_id, module_id, run_number) do nothing
    returning student_id, student_number, score
  ), score_totals as (
    select student_id, student_number, sum(score)::int as score_delta
    from inserted
    group by student_id, student_number
  ), updated_students as (
    update public.students student
    set session_score = student.session_score + total.score_delta,
        score = student.score + total.score_delta,
        last_active = timezone('utc', now())
    from score_totals total
    where student.id = total.student_id
    returning student.id
  )
  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  select target_session.teacher_username,
         total.student_number,
         student.nickname,
         total.score_delta,
         timezone('utc', now())
  from score_totals total
  join public.students student on student.id = total.student_id
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  -- Keep the existing accuracy-weighted group ranking for every eligible
  -- module. Week 5 Modules 2 and 3 are fixed-duration games, so their bonus
  -- is explicitly zero while Week 5 Module 1 and earlier modules are unchanged.
  with ranked as (
    select submission.id,
           submission.student_id,
           submission.student_number,
           submission.score,
           submission.speed_bonus,
           row_number() over (order by submission.submitted_at, submission.id) - 1 as position,
           count(*) over () as group_size
    from public.submissions submission
    where submission.session_id = target_session.id
      and submission.week_id = target_session.selected_week
      and submission.module_id = target_session.current_module
      and submission.run_number = target_session.current_run_number
      and submission.is_submitted = true
      and submission.completion_status = 'completed'
  ), calculated as (
    select ranked.*,
           case
             when target_session.selected_week = 5 and target_session.current_module in (2, 3) then 0
             else round(
               (case
                 when ranked.group_size = 1 then 10
                 else round(10.0 * (ranked.group_size - 1 - ranked.position) / (ranked.group_size - 1))::int
               end)
               * greatest(0, least(ranked.score, public.module_score_cap(target_session.selected_week, target_session.current_module)))
               / public.module_score_cap(target_session.selected_week, target_session.current_module)::numeric
             )::int
           end as calculated_bonus
    from ranked
  ), changed as (
    update public.submissions submission
    set speed_bonus = calculated.calculated_bonus
    from calculated
    where submission.id = calculated.id
      and submission.speed_bonus is distinct from calculated.calculated_bonus
    returning submission.student_id,
              submission.student_number,
              calculated.calculated_bonus - calculated.speed_bonus as bonus_delta
  ), bonus_totals as (
    select student_id, student_number, sum(bonus_delta)::int as bonus_delta
    from changed
    group by student_id, student_number
  ), updated_students as (
    update public.students student
    set session_score = greatest(0, student.session_score + total.bonus_delta),
        score = greatest(0, student.score + total.bonus_delta),
        last_active = timezone('utc', now())
    from bonus_totals total
    where student.id = total.student_id
    returning student.id
  )
  insert into public.student_profiles (teacher_username, student_number, full_name, total_score, last_seen)
  select target_session.teacher_username,
         total.student_number,
         student.nickname,
         total.bonus_delta,
         timezone('utc', now())
  from bonus_totals total
  join public.students student on student.id = total.student_id
  on conflict (teacher_username, student_number) do update
  set full_name = excluded.full_name,
      total_score = greatest(0, public.student_profiles.total_score + excluded.total_score),
      last_seen = excluded.last_seen;

  delete from public.module_drafts
  where session_id = target_session.id
    and week_id = target_session.selected_week
    and module_id = target_session.current_module
    and run_number = target_session.current_run_number;

  update public.sessions
  set is_module_started = false,
      module_started_at = null,
      module_stage = 3
  where id = target_session.id
  returning * into updated_session;

  return updated_session;
end;
$$;

revoke all on function public.finish_session_module(uuid, bigint) from public, anon, authenticated;
grant execute on function public.finish_session_module(uuid, bigint) to service_role;
