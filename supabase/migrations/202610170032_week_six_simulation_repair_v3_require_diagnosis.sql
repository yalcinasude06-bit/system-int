-- Reject repair records that omit diagnosis; diagnosis-only partial records remain valid.
create or replace function public.week6_simulation_repair_score_v3(payload jsonb)
returns int language plpgsql immutable set search_path=public as $$
declare selected jsonb:=coalesce(payload,'{}'::jsonb)->'selectedCaseIds'; progress jsonb:=coalesce(payload,'{}'::jsonb)->'progress'; record jsonb; ordinal bigint; case_id text; token_id text; result int:=0;
begin
 if payload->>'gameId' is distinct from 'week-6-simulation-repair-v3' or jsonb_typeof(selected) is distinct from 'array' or jsonb_typeof(progress) is distinct from 'array' or jsonb_array_length(selected)<>5 or jsonb_array_length(progress)>5 then return 0; end if;
 if exists(select 1 from jsonb_array_elements_text(selected) x(value) where public.week6_simulation_repair_category(value) is null) or (select count(distinct value) from jsonb_array_elements_text(selected))<>5 or (select count(distinct public.week6_simulation_repair_category(value)) from jsonb_array_elements_text(selected))<>5 or (select count(*) from jsonb_array_elements_text(selected) x(value) where left(value,1)='V') not between 2 and 3 then return 0; end if;
 for record,ordinal in select value,ordinality from jsonb_array_elements(progress) with ordinality loop
  case_id:=selected->>(ordinal::int-1);
  if jsonb_typeof(record) is distinct from 'object' or record->>'caseId' is distinct from case_id or record->>'diagnosis' is null or record->>'diagnosis' not in ('verification','validation') then return 0; end if;
  if record->>'diagnosis'=(case when left(case_id,1)='V' then 'verification' else 'validation' end) then result:=result+8; end if;
  token_id:=record->>'selectedTokenId';
  if token_id is not null then if not(token_id=any(public.week6_simulation_repair_token_ids(case_id))) then return 0; end if; if token_id=public.week6_simulation_repair_correct_token(case_id) then result:=result+12; end if; end if;
 end loop; return greatest(0,least(result,100));
end; $$;
revoke all on function public.week6_simulation_repair_score_v3(jsonb) from public,anon,authenticated;
grant execute on function public.week6_simulation_repair_score_v3(jsonb) to service_role;
