create or replace function public.join_session_student(
  target_pin text,
  target_student_number text,
  target_full_name text,
  target_avatar text
)
returns public.students
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_number text := btrim(coalesce(target_student_number, ''));
  normalized_name text := btrim(coalesce(target_full_name, ''));
  normalized_avatar text := btrim(coalesce(target_avatar, ''));
  target_session_id uuid;
  joined_student public.students%rowtype;
begin
  if char_length(normalized_number) < 2 or char_length(normalized_number) > 30 then
    raise exception 'Student number must contain between 2 and 30 characters';
  end if;

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 50 then
    raise exception 'Student name must contain between 2 and 50 characters';
  end if;

  if char_length(normalized_avatar) < 1 or char_length(normalized_avatar) > 20 then
    normalized_avatar := '🎓';
  end if;

  select id into target_session_id
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''))
    and is_active = true;

  if target_session_id is null then
    raise exception 'Session is not active';
  end if;

  insert into public.students (
    session_id,
    student_number,
    nickname,
    avatar,
    last_active
  ) values (
    target_session_id,
    normalized_number,
    normalized_name,
    normalized_avatar,
    timezone('utc', now())
  )
  on conflict (session_id, student_number) do update
  set nickname = excluded.nickname,
      avatar = excluded.avatar,
      last_active = excluded.last_active
  returning * into joined_student;

  insert into public.student_profiles (
    student_number,
    full_name,
    last_seen
  ) values (
    normalized_number,
    normalized_name,
    timezone('utc', now())
  )
  on conflict (student_number) do update
  set full_name = excluded.full_name,
      last_seen = excluded.last_seen;

  return joined_student;
end;
$$;

revoke all on function public.join_session_student(text, text, text, text) from public;
grant execute on function public.join_session_student(text, text, text, text)
  to anon, authenticated;

comment on function public.join_session_student(text, text, text, text) is
  'Atomically joins by PIN and refreshes one student and their all-time profile in a single request.';

create or replace function public.get_student_game_state(
  target_pin text,
  target_student_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_session public.sessions%rowtype;
  target_student public.students%rowtype;
  target_profile public.student_profiles%rowtype;
  student_submissions jsonb;
  classmates jsonb;
begin
  select * into target_session
  from public.sessions
  where pin_code = btrim(coalesce(target_pin, ''));

  if target_session.id is null then
    raise exception 'Session was not found';
  end if;

  select * into target_student
  from public.students
  where id = target_student_id
    and session_id = target_session.id;

  if target_student.id is null then
    raise exception 'Student does not belong to this session';
  end if;

  select * into target_profile
  from public.student_profiles
  where student_number = target_student.student_number;

  select coalesce(jsonb_agg(to_jsonb(answer) order by answer.submitted_at), '[]'::jsonb)
  into student_submissions
  from public.submissions answer
  where answer.session_id = target_session.id
    and answer.student_id = target_student.id;

  select coalesce(
    jsonb_agg(to_jsonb(classmate) order by classmate.session_score desc, classmate.joined_at),
    '[]'::jsonb
  )
  into classmates
  from public.students classmate
  where classmate.session_id = target_session.id;

  return jsonb_build_object(
    'session', to_jsonb(target_session),
    'student', to_jsonb(target_student),
    'profile', case when target_profile.student_number is null then null else to_jsonb(target_profile) end,
    'submissions', student_submissions,
    'classmates', classmates
  );
end;
$$;

revoke all on function public.get_student_game_state(text, uuid) from public;
grant execute on function public.get_student_game_state(text, uuid)
  to anon, authenticated;

comment on function public.get_student_game_state(text, uuid) is
  'Loads the complete student play state in one database round trip.';
