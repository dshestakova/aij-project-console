alter table public.projects
add column if not exists is_social boolean not null default false;

alter table public.industry_units
add column if not exists color_key text;

alter table public.industry_units
add column if not exists sort_order integer;

comment on table public.clusters is
  'Deprecated compatibility reference. The product UI and analytics use industry_units as the single project classification.';

comment on column public.projects.cluster_id is
  'Deprecated compatibility field. The product UI and analytics use projects.industry_unit_id.';

insert into public.industry_units (name, color_key, sort_order, is_active)
values
  ('Сфера услуг', 'cyan', 10, true),
  ('Торговля', 'green', 20, true),
  ('Промышленность', 'violet', 30, true),
  ('Недвижимость', 'orange', 40, true),
  ('Производство', 'indigo', 50, true),
  ('Инфраструктура', 'teal', 60, true),
  ('Социальный', 'rose', 70, true),
  ('СКМ', 'blue-violet', 80, true),
  ('Транспорт', 'blue-gray', 90, true)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

with skm as (
  select id
  from public.industry_units
  where lower(name) = lower('СКМ')
  limit 1
),
opk as (
  select id
  from public.industry_units
  where lower(name) = lower('ОПК')
  limit 1
)
update public.projects
set
  industry_unit_id = skm.id,
  updated_at = now()
from skm, opk
where
  public.projects.industry_unit_id = opk.id
  and skm.id <> opk.id;

update public.industry_units
set
  is_active = false,
  updated_at = now()
where lower(name) = lower('ОПК');
