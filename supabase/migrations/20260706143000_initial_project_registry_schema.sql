create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_statuses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  color_key text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.flagship_statuses (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  color_key text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clusters (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  color_key text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  full_name text not null,
  person_type text not null check (person_type in ('csm', 'director')),
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.industry_units (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  external_id text not null unique,
  client text,
  project_name text,
  cluster_id uuid references public.clusters(id),
  status_id uuid references public.project_statuses(id),
  is_flagship boolean not null default false,
  flagship_status_id uuid references public.flagship_statuses(id),
  csm_id uuid references public.people(id),
  director_id uuid references public.people(id),
  industry_unit_id uuid references public.industry_units(id),
  essence text,
  progress text,
  next_step text,
  funding text,
  funding_status text,
  comment text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_flagship_status_required check (
    (is_flagship = false and flagship_status_id is null)
    or (is_flagship = true)
  )
);

create table public.project_changes (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  field_name text not null,
  old_value text,
  new_value text,
  source text,
  comment text
);

create table public.project_files (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create table public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_queries (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid references public.profiles(id),
  question text not null,
  response_summary text,
  token_usage jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index project_statuses_active_sort_idx on public.project_statuses(is_active, sort_order);
create index flagship_statuses_active_sort_idx on public.flagship_statuses(is_active, sort_order);
create index clusters_active_sort_idx on public.clusters(is_active, sort_order);
create index people_type_active_name_idx on public.people(person_type, is_active, full_name);
create index industry_units_active_name_idx on public.industry_units(is_active, name);
create index projects_status_idx on public.projects(status_id);
create index projects_cluster_idx on public.projects(cluster_id);
create index projects_archived_idx on public.projects(is_archived);
create index projects_csm_idx on public.projects(csm_id);
create index projects_director_idx on public.projects(director_id);
create index project_changes_project_changed_idx on public.project_changes(project_id, changed_at desc);
create index project_files_project_idx on public.project_files(project_id);
create index audit_log_user_created_idx on public.audit_log(user_id, created_at desc);
create index audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index ai_queries_user_created_idx on public.ai_queries(user_id, created_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger project_statuses_set_updated_at
  before update on public.project_statuses
  for each row execute function public.set_updated_at();

create trigger flagship_statuses_set_updated_at
  before update on public.flagship_statuses
  for each row execute function public.set_updated_at();

create trigger clusters_set_updated_at
  before update on public.clusters
  for each row execute function public.set_updated_at();

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

create trigger industry_units_set_updated_at
  before update on public.industry_units
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

insert into public.project_statuses (name, color_key, sort_order)
values
  ('идея/КП', 'amber', 10),
  ('факт оплаты', 'green', 20),
  ('уточнение ТЗ', 'blue', 30),
  ('в разработке', 'violet', 40),
  ('на паузе', 'gray', 50)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.flagship_statuses (name, color_key, sort_order)
values
  ('очередь на паспорт', 'amber', 10),
  ('заполнение паспорта', 'blue', 20),
  ('внесен на ПРБР', 'green', 30)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.clusters (name, color_key, sort_order)
values
  ('Сфера услуг', 'blue', 10),
  ('Торговля', 'green', 20),
  ('Промышленность', 'violet', 30),
  ('Недвижимость', 'amber', 40),
  ('Производство', 'slate', 50),
  ('Инфраструктура', 'cyan', 60),
  ('Социальный', 'rose', 70),
  ('СКМ', 'indigo', 80),
  ('Транспорт', 'gray', 90)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

alter table public.profiles enable row level security;
alter table public.project_statuses enable row level security;
alter table public.flagship_statuses enable row level security;
alter table public.clusters enable row level security;
alter table public.people enable row level security;
alter table public.industry_units enable row level security;
alter table public.projects enable row level security;
alter table public.project_changes enable row level security;
alter table public.project_files enable row level security;
alter table public.audit_log enable row level security;
alter table public.ai_queries enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'admin'
$$;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('admin', 'editor')
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_admin_or_editor() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_editor() to authenticated;

revoke all on
  public.profiles,
  public.project_statuses,
  public.flagship_statuses,
  public.clusters,
  public.people,
  public.industry_units,
  public.projects,
  public.project_changes,
  public.project_files,
  public.audit_log,
  public.ai_queries
from anon;

grant select on
  public.profiles,
  public.project_statuses,
  public.flagship_statuses,
  public.clusters,
  public.people,
  public.industry_units,
  public.projects,
  public.project_changes,
  public.project_files,
  public.ai_queries
to authenticated;

grant select on public.audit_log to authenticated;

grant insert, update, delete on
  public.profiles,
  public.project_statuses,
  public.flagship_statuses,
  public.clusters,
  public.people,
  public.industry_units
to authenticated;

grant insert, update on
  public.projects,
  public.project_changes,
  public.project_files
to authenticated;

grant insert on public.ai_queries to authenticated;

create policy "profiles_read_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

create policy "project_statuses_authenticated_read"
on public.project_statuses
for select
to authenticated
using (true);

create policy "project_statuses_admin_write"
on public.project_statuses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "flagship_statuses_authenticated_read"
on public.flagship_statuses
for select
to authenticated
using (true);

create policy "flagship_statuses_admin_write"
on public.flagship_statuses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "clusters_authenticated_read"
on public.clusters
for select
to authenticated
using (true);

create policy "clusters_admin_write"
on public.clusters
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "people_authenticated_read"
on public.people
for select
to authenticated
using (true);

create policy "people_admin_write"
on public.people
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "industry_units_authenticated_read"
on public.industry_units
for select
to authenticated
using (true);

create policy "industry_units_admin_write"
on public.industry_units
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "projects_authenticated_read"
on public.projects
for select
to authenticated
using (true);

create policy "projects_admin_editor_insert"
on public.projects
for insert
to authenticated
with check (public.is_admin_or_editor());

create policy "projects_admin_editor_update"
on public.projects
for update
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

create policy "project_changes_authenticated_read"
on public.project_changes
for select
to authenticated
using (true);

create policy "project_changes_admin_editor_insert"
on public.project_changes
for insert
to authenticated
with check (public.is_admin_or_editor());

create policy "project_files_authenticated_read"
on public.project_files
for select
to authenticated
using (true);

create policy "project_files_admin_editor_insert"
on public.project_files
for insert
to authenticated
with check (public.is_admin_or_editor());

create policy "project_files_admin_editor_update"
on public.project_files
for update
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

create policy "audit_log_admin_read"
on public.audit_log
for select
to authenticated
using (public.is_admin());

create policy "ai_queries_admin_or_own_read"
on public.ai_queries
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "ai_queries_own_insert"
on public.ai_queries
for insert
to authenticated
with check (user_id = auth.uid());
