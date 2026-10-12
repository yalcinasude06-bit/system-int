-- Week 4 Module 3 now uses eight balanced cards at ten points each.
create or replace function public.module_score_cap(target_week_id int, target_module_id int)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when target_week_id = 4 and target_module_id = 1 then 90
    when target_week_id = 4 and target_module_id = 3 then 80
    else 100
  end;
$$;

revoke all on function public.module_score_cap(int, int) from public;
grant execute on function public.module_score_cap(int, int) to anon, authenticated;
