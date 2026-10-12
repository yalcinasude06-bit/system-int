-- Week 4 final order:
-- 1) Factory Transformation (9 decisions, max 90)
-- 2) Boss Approach (10 questions, max 100)
-- 3) System / Not a System (6 cards, max 60)
-- Preserve already-recorded Week 4 work by moving the former modules in
-- descending order before Module 1 is reused by the new game.
update public.submissions set module_id = 3 where week_id = 4 and module_id = 2;
update public.submissions set module_id = 2 where week_id = 4 and module_id = 1;

update public.module_drafts set module_id = 3 where week_id = 4 and module_id = 2;
update public.module_drafts set module_id = 2 where week_id = 4 and module_id = 1;

update public.module_feedback set module_id = 3 where week_id = 4 and module_id = 2;
update public.module_feedback set module_id = 2 where week_id = 4 and module_id = 1;

update public.sessions
set current_module = case current_module when 2 then 3 when 1 then 2 else current_module end
where selected_week = 4;

create or replace function public.module_score_cap(target_week_id int, target_module_id int)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when target_week_id = 4 and target_module_id = 1 then 90
    when target_week_id = 4 and target_module_id = 3 then 60
    else 100
  end;
$$;

revoke all on function public.module_score_cap(int, int) from public;
grant execute on function public.module_score_cap(int, int) to anon, authenticated;
