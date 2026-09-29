alter table public.students
  add column if not exists student_number text;

update public.students
set student_number = 'legacy-' || left(id::text, 8)
where student_number is null or btrim(student_number) = '';

alter table public.students
  alter column student_number set not null;

create unique index if not exists students_session_student_number_key
  on public.students(session_id, student_number);

create index if not exists students_student_number_idx
  on public.students(student_number);
