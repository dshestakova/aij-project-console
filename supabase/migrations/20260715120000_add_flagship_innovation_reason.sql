alter table public.projects
  add column if not exists flagship_innovation_reason text;

insert into public.flagship_statuses (name, color_key, sort_order, is_active)
values
  ('требуется помощь', 'amber', 25, true)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
