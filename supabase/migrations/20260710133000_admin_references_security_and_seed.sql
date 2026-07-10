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
