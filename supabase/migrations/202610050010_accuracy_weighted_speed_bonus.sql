comment on column public.submissions.speed_bonus is
  'Server-calculated 0–10 order bonus multiplied by the submission accuracy ratio.';

do $$
declare
  bonus_row record;
  time_bonus int;
  calculated_bonus int;
  bonus_delta int;
begin
  for bonus_row in
    select ranked.id,
           ranked.student_id,
           ranked.student_number,
           ranked.score,
           ranked.speed_bonus,
           ranked.position,
           ranked.group_size
    from (
      select submission.id,
             submission.student_id,
             submission.student_number,
             submission.score,
             submission.speed_bonus,
             row_number() over (
               partition by submission.session_id, submission.week_id, submission.module_id
               order by submission.submitted_at, submission.id
             ) - 1 as position,
             count(*) over (
               partition by submission.session_id, submission.week_id, submission.module_id
             ) as group_size
      from public.submissions as submission
      where submission.is_submitted = true
    ) as ranked
  loop
    time_bonus := case
      when bonus_row.group_size = 1 then 10
      else round(
        10.0 * (bonus_row.group_size - 1 - bonus_row.position)
        / (bonus_row.group_size - 1)
      )::int
    end;
    calculated_bonus := round(
      time_bonus * greatest(0, least(bonus_row.score, 100)) / 100.0
    )::int;
    bonus_delta := calculated_bonus - bonus_row.speed_bonus;

    if bonus_delta <> 0 then
      update public.submissions
      set speed_bonus = calculated_bonus
      where id = bonus_row.id;

      update public.students
      set session_score = session_score + bonus_delta,
          score = score + bonus_delta
      where id = bonus_row.student_id;

      update public.student_profiles
      set total_score = total_score + bonus_delta
      where student_number = bonus_row.student_number;
    end if;
  end loop;
end;
$$;

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
  bonus_row record;
  bounded_score int := greatest(0, least(coalesce(new_score, 0), 100));
  group_size int;
  time_bonus int;
  calculated_bonus int;
  bonus_delta int;
begin
  select * into target_session
  from public.sessions
  where id = target_session_id
  for update;

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
    payload, score, speed_bonus, is_submitted, updated_at, submitted_at
  ) values (
    target_session_id, target_student_id, target_student.student_number,
    target_week_id, target_module_id, greatest(target_stage, 1),
    coalesce(new_payload, '{}'::jsonb), bounded_score, 0, true,
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
      score = score + bounded_score,
      last_active = timezone('utc', now())
  where id = target_student_id;

  insert into public.student_profiles (student_number, full_name, total_score, last_seen)
  values (target_student.student_number, target_student.nickname, bounded_score, timezone('utc', now()))
  on conflict (student_number) do update
  set full_name = excluded.full_name,
      total_score = public.student_profiles.total_score + excluded.total_score,
      last_seen = excluded.last_seen;

  select count(*)::int into group_size
  from public.submissions
  where session_id = target_session_id
    and week_id = target_week_id
    and module_id = target_module_id
    and is_submitted = true;

  for bonus_row in
    select submission.id,
           submission.student_id,
           submission.student_number,
           submission.score,
           submission.speed_bonus,
           row_number() over (order by submission.submitted_at, submission.id) - 1 as position
    from public.submissions as submission
    where submission.session_id = target_session_id
      and submission.week_id = target_week_id
      and submission.module_id = target_module_id
      and submission.is_submitted = true
    order by submission.submitted_at, submission.id
  loop
    time_bonus := case
      when group_size = 1 then 10
      else round(10.0 * (group_size - 1 - bonus_row.position) / (group_size - 1))::int
    end;
    calculated_bonus := round(
      time_bonus * greatest(0, least(bonus_row.score, 100)) / 100.0
    )::int;
    bonus_delta := calculated_bonus - bonus_row.speed_bonus;

    if bonus_delta <> 0 then
      update public.submissions
      set speed_bonus = calculated_bonus
      where id = bonus_row.id;

      update public.students
      set session_score = session_score + bonus_delta,
          score = score + bonus_delta
      where id = bonus_row.student_id;

      update public.student_profiles
      set total_score = total_score + bonus_delta
      where student_number = bonus_row.student_number;
    end if;
  end loop;

  select * into created_submission
  from public.submissions
  where id = created_submission.id;

  return jsonb_build_object('submission', to_jsonb(created_submission), 'was_new', true);
end;
$$;

revoke all on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int) from public;
grant execute on function public.submit_module_once(uuid, uuid, int, int, int, jsonb, int)
  to anon, authenticated;
