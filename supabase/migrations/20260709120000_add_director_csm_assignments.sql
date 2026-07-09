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
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'director_csm_assignments_set_updated_at'
  ) then
    create trigger director_csm_assignments_set_updated_at
      before update on public.director_csm_assignments
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.director_csm_assignments enable row level security;

revoke all on public.director_csm_assignments from anon;

grant select, insert, update on public.director_csm_assignments to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'director_csm_assignments'
      and policyname = 'director_csm_assignments_authenticated_read_active'
  ) then
    create policy "director_csm_assignments_authenticated_read_active"
    on public.director_csm_assignments
    for select
    to authenticated
    using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'director_csm_assignments'
      and policyname = 'director_csm_assignments_admin_editor_insert'
  ) then
    create policy "director_csm_assignments_admin_editor_insert"
    on public.director_csm_assignments
    for insert
    to authenticated
    with check (public.is_admin_or_editor());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'director_csm_assignments'
      and policyname = 'director_csm_assignments_admin_editor_update'
  ) then
    create policy "director_csm_assignments_admin_editor_update"
    on public.director_csm_assignments
    for update
    to authenticated
    using (public.is_admin_or_editor())
    with check (public.is_admin_or_editor());
  end if;
end;
$$;
