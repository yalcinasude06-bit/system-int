alter table public.sessions
  drop constraint if exists sessions_current_module_check;

alter table public.sessions
  add constraint sessions_current_module_check
  check (current_module between 1 and 5);

alter table public.submissions
  drop constraint if exists submissions_module_id_check;

alter table public.submissions
  add constraint submissions_module_id_check
  check (module_id between 1 and 5);

comment on constraint sessions_current_module_check on public.sessions is
  'Week modules supported by the live classroom application.';

comment on constraint submissions_module_id_check on public.submissions is
  'Submission module identifiers supported by the application.';
