create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid default gen_random_uuid() primary key,
  pin_code varchar(6) unique not null check (pin_code ~ '^[0-9]{6}$'),
  title varchar(255) not null default 'Sistem Analizi Dersi',
  current_module int not null default 1 check (current_module between 1 and 4),
  module_stage int not null default 1 check (module_stage > 0),
  is_active boolean not null default true,
  fault_injected boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.students (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  nickname varchar(50) not null check (char_length(trim(nickname)) between 2 and 50),
  avatar varchar(20) not null default '🎓',
  score int not null default 0 check (score >= 0),
  last_active timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  module_id int not null check (module_id between 1 and 4),
  stage int not null default 1 check (stage > 0),
  payload jsonb not null default '{}'::jsonb,
  score int not null default 0 check (score >= 0),
  is_submitted boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(session_id, student_id, module_id, stage)
);

create index if not exists students_session_id_idx on public.students(session_id);
create index if not exists submissions_session_module_idx on public.submissions(session_id, module_id);

alter table public.sessions enable row level security;
alter table public.students enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "public sessions access" on public.sessions;
create policy "public sessions access" on public.sessions for all to anon, authenticated using (true) with check (true);
drop policy if exists "public students access" on public.students;
create policy "public students access" on public.students for all to anon, authenticated using (true) with check (true);
drop policy if exists "public submissions access" on public.submissions;
create policy "public submissions access" on public.submissions for all to anon, authenticated using (true) with check (true);

create or replace function public.increment_student_score(target_student_id uuid, new_score int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.students
  set score = (
    select coalesce(sum(score), 0)::int
    from public.submissions
    where student_id = target_student_id and is_submitted = true
  ),
  last_active = timezone('utc', now())
  where id = target_student_id;
end;
$$;
grant execute on function public.increment_student_score(uuid, int) to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then alter publication supabase_realtime add table public.sessions; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students'
  ) then alter publication supabase_realtime add table public.students; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then alter publication supabase_realtime add table public.submissions; end if;
end $$;
