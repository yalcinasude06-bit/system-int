alter table public.sessions
  add column if not exists selected_week int not null default 1 check (selected_week > 0);

alter table public.students
  add column if not exists session_score int,
  add column if not exists joined_at timestamptz default timezone('utc', now());

update public.students
set session_score = coalesce(session_score, score, 0),
    joined_at = coalesce(joined_at, last_active, timezone('utc', now()));

alter table public.students
  alter column session_score set default 0,
  alter column session_score set not null,
  alter column joined_at set not null;

create table if not exists public.student_profiles (
  student_number text primary key,
  full_name text not null,
  total_score int not null default 0 check (total_score >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  last_seen timestamptz not null default timezone('utc', now())
);

insert into public.student_profiles (student_number, full_name, total_score, last_seen)
select student_number, max(nickname), sum(coalesce(session_score, 0))::int, max(last_active)
from public.students
group by student_number
on conflict (student_number) do nothing;

alter table public.submissions
  add column if not exists student_number text,
  add column if not exists week_id int not null default 1 check (week_id > 0),
  add column if not exists submitted_at timestamptz default timezone('utc', now());

update public.submissions as submission
set student_number = student.student_number,
    submitted_at = coalesce(submission.submitted_at, submission.updated_at, timezone('utc', now()))
from public.students as student
where submission.student_id = student.id
  and submission.student_number is null;

alter table public.submissions
  alter column student_number set not null,
  alter column submitted_at set not null;

with ranked as (
  select id,
         row_number() over (
           partition by session_id, student_number, week_id, module_id
           order by stage desc, updated_at desc, id desc
         ) as row_number
  from public.submissions
)
delete from public.submissions
where id in (select id from ranked where row_number > 1);

alter table public.submissions
  drop constraint if exists submissions_session_id_student_id_module_id_stage_key;

create unique index if not exists submissions_one_attempt_key
  on public.submissions(session_id, student_number, week_id, module_id);

create index if not exists submissions_student_week_idx
  on public.submissions(student_number, week_id, module_id);

alter table public.student_profiles enable row level security;
drop policy if exists "public student profiles access" on public.student_profiles;
create policy "public student profiles access" on public.student_profiles
  for all to anon, authenticated using (true) with check (true);

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
  target_student public.students%rowtype;
  created_submission public.submissions%rowtype;
  existing_submission public.submissions%rowtype;
  bounded_score int := greatest(0, least(coalesce(new_score, 0), 100));
begin
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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_profiles'
  ) then
    alter publication supabase_realtime add table public.student_profiles;
  end if;
end $$;
