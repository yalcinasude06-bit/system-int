-- Align Week 5 Module 1 server-side scoring with the revised 25-case pool.
-- Each stage now contains one January, February, March, April and May initiator.

create or replace function public.week5_delay_trail_initiator(case_id text)
returns int
language sql
immutable
set search_path = public
as $$
  select case case_id
    when 'G01' then 0 when 'G02' then 1 when 'G03' then 2 when 'G04' then 3 when 'G05' then 4
    when 'G06' then 1 when 'G07' then 2 when 'G08' then 3 when 'G09' then 4 when 'G10' then 0
    when 'G11' then 2 when 'G12' then 3 when 'G13' then 4 when 'G14' then 0 when 'G15' then 1
    when 'G16' then 3 when 'G17' then 4 when 'G18' then 0 when 'G19' then 1 when 'G20' then 2
    when 'G21' then 4 when 'G22' then 0 when 'G23' then 1 when 'G24' then 2 when 'G25' then 3
    else null
  end;
$$;

revoke all on function public.week5_delay_trail_initiator(text) from public, anon, authenticated;
