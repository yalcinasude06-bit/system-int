-- Students and teachers still need public read/write access for the live classroom flow,
-- but bulk deletion is reserved for the authenticated server-side reset endpoint.
drop policy if exists "public sessions access" on public.sessions;
drop policy if exists "public students access" on public.students;
drop policy if exists "public submissions access" on public.submissions;
drop policy if exists "public student profiles access" on public.student_profiles;

create policy "public sessions read" on public.sessions
  for select to anon, authenticated using (true);
create policy "public sessions create" on public.sessions
  for insert to anon, authenticated with check (true);
create policy "public sessions update" on public.sessions
  for update to anon, authenticated using (true) with check (true);

create policy "public students read" on public.students
  for select to anon, authenticated using (true);
create policy "public students create" on public.students
  for insert to anon, authenticated with check (true);
create policy "public students update" on public.students
  for update to anon, authenticated using (true) with check (true);

create policy "public submissions read" on public.submissions
  for select to anon, authenticated using (true);
create policy "public submissions create" on public.submissions
  for insert to anon, authenticated with check (true);
create policy "public submissions update" on public.submissions
  for update to anon, authenticated using (true) with check (true);

create policy "public student profiles read" on public.student_profiles
  for select to anon, authenticated using (true);
create policy "public student profiles create" on public.student_profiles
  for insert to anon, authenticated with check (true);
create policy "public student profiles update" on public.student_profiles
  for update to anon, authenticated using (true) with check (true);
