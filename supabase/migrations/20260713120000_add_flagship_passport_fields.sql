alter table public.projects
  add column if not exists flagship_client_current_state text,
  add column if not exists flagship_current_process text,
  add column if not exists flagship_scope text,
  add column if not exists flagship_client_usage text,
  add column if not exists flagship_result_users text,
  add column if not exists flagship_tech_stack text,
  add column if not exists flagship_available_data text,
  add column if not exists flagship_uncertain_data text,
  add column if not exists flagship_out_of_scope text,
  add column if not exists flagship_competitors text;

create sequence if not exists public.project_external_id_seq;

revoke all on sequence public.project_external_id_seq from public;
grant usage, select on sequence public.project_external_id_seq to authenticated;

do $$
declare
  max_existing_number bigint;
  current_sequence_number bigint;
  next_sequence_number bigint;
  sequence_was_called boolean;
begin
  select coalesce(max((substring(external_id from '([0-9]+)$'))::bigint), 0)
  into max_existing_number
  from public.projects
  where external_id ~ '[0-9]+$';

  select last_value, is_called
  into current_sequence_number, sequence_was_called
  from public.project_external_id_seq;

  next_sequence_number := greatest(
    max_existing_number,
    case
      when sequence_was_called then current_sequence_number
      else current_sequence_number - 1
    end
  );

  if next_sequence_number > 0 then
    perform setval('public.project_external_id_seq', next_sequence_number, true);
  else
    perform setval('public.project_external_id_seq', 1, false);
  end if;
end;
$$;

create or replace function public.generate_project_external_id()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'AIJ-У-' || lpad(nextval('public.project_external_id_seq')::text, 3, '0')
$$;

revoke all on function public.generate_project_external_id() from public;
grant execute on function public.generate_project_external_id() to authenticated;

alter table public.projects
  alter column external_id set default public.generate_project_external_id();
