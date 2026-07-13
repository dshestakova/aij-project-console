insert into public.flagship_statuses (name, color_key, sort_order, is_active)
values
  ('загружен на ПРБР', 'blue', 40, true),
  ('одобрен ЦА', 'green', 50, true)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create table if not exists public.director_csm_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  external_id text unique not null,
  director_id uuid references public.people(id),
  director_name text not null,
  industry_unit_id uuid references public.industry_units(id),
  industry_unit_name text not null,
  csm_id uuid references public.people(id),
  csm_name text not null,
  is_active boolean not null default true,
  comment text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.director_csm_assignments
  add column if not exists id uuid default extensions.gen_random_uuid(),
  add column if not exists external_id text,
  add column if not exists director_id uuid references public.people(id),
  add column if not exists director_name text,
  add column if not exists industry_unit_id uuid references public.industry_units(id),
  add column if not exists industry_unit_name text,
  add column if not exists csm_id uuid references public.people(id),
  add column if not exists csm_name text,
  add column if not exists is_active boolean default true,
  add column if not exists comment text,
  add column if not exists sort_order integer,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists updated_by uuid references public.profiles(id);

update public.director_csm_assignments
set
  id = coalesce(id, extensions.gen_random_uuid()),
  external_id = coalesce(external_id, 'manual-' || coalesce(id::text, extensions.gen_random_uuid()::text)),
  director_name = coalesce(director_name, 'Без директора'),
  industry_unit_name = coalesce(industry_unit_name, 'Без отраслевого управления'),
  csm_name = coalesce(csm_name, 'Без CSM'),
  is_active = coalesce(is_active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  id is null
  or external_id is null
  or director_name is null
  or industry_unit_name is null
  or csm_name is null
  or is_active is null
  or created_at is null
  or updated_at is null;

alter table public.director_csm_assignments
  alter column id set default extensions.gen_random_uuid(),
  alter column id set not null,
  alter column external_id set not null,
  alter column director_name set not null,
  alter column industry_unit_name set not null,
  alter column csm_name set not null,
  alter column is_active set default true,
  alter column is_active set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.director_csm_assignments'::regclass
      and contype = 'p'
  ) then
    alter table public.director_csm_assignments
      add constraint director_csm_assignments_pkey primary key (id);
  end if;
end;
$$;

create unique index if not exists director_csm_assignments_external_id_key
on public.director_csm_assignments(external_id);

create index if not exists director_csm_assignments_active_sort_idx
on public.director_csm_assignments(is_active, sort_order);

create index if not exists director_csm_assignments_director_idx
on public.director_csm_assignments(director_id);

create index if not exists director_csm_assignments_csm_idx
on public.director_csm_assignments(csm_id);

create index if not exists director_csm_assignments_industry_unit_idx
on public.director_csm_assignments(industry_unit_id);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null
    and not exists (
      select 1
      from pg_trigger
      where tgname = 'director_csm_assignments_set_updated_at'
        and tgrelid = 'public.director_csm_assignments'::regclass
    )
  then
    create trigger director_csm_assignments_set_updated_at
      before update on public.director_csm_assignments
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.director_csm_assignments enable row level security;

revoke all on public.director_csm_assignments from anon;

grant select, insert, update on public.director_csm_assignments to authenticated;

drop policy if exists "director_csm_assignments_admin_editor_insert"
on public.director_csm_assignments;

drop policy if exists "director_csm_assignments_admin_editor_update"
on public.director_csm_assignments;

drop policy if exists "director_csm_assignments_admin_read_all"
on public.director_csm_assignments;

drop policy if exists "director_csm_assignments_admin_insert"
on public.director_csm_assignments;

drop policy if exists "director_csm_assignments_admin_update"
on public.director_csm_assignments;

drop policy if exists "director_csm_assignments_authenticated_read_active"
on public.director_csm_assignments;

create policy "director_csm_assignments_authenticated_read_active"
on public.director_csm_assignments
for select
to authenticated
using (is_active = true);

create policy "director_csm_assignments_admin_read_all"
on public.director_csm_assignments
for select
to authenticated
using (public.is_admin());

create policy "director_csm_assignments_admin_insert"
on public.director_csm_assignments
for insert
to authenticated
with check (public.is_admin());

create policy "director_csm_assignments_admin_update"
on public.director_csm_assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
