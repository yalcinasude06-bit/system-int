-- Week 4 Module 2 now presents six cards at ten points each. Keep the
-- server-side score ceiling aligned with the client while preserving the
-- existing 100-point cap for every other module.

create or replace function public.module_score_cap(target_week_id int, target_module_id int)
returns int
language sql
immutable
as $$
  select case when target_week_id = 4 and target_module_id = 2 then 60 else 100 end;
$$;

revoke all on function public.module_score_cap(int, int) from public;
grant execute on function public.module_score_cap(int, int) to anon, authenticated;
