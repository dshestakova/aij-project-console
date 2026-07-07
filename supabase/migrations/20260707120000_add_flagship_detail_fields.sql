alter table public.projects
  add column if not exists flagship_description_uploaded boolean not null default false,
  add column if not exists flagship_passport_uploaded boolean not null default false,
  add column if not exists flagship_innovation_level text,
  add column if not exists flagship_uploaded_to_prbr boolean not null default false,
  add column if not exists flagship_approved_by_ca boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_flagship_innovation_level_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_flagship_innovation_level_check
      check (
        flagship_innovation_level is null
        or flagship_innovation_level in ('высокий', 'средний', 'низкий')
      );
  end if;
end;
$$;

insert into public.flagship_statuses (name, color_key, sort_order)
values
  ('загружен на ПРБР', 'blue', 40),
  ('одобрен ЦА', 'green', 50)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.clusters (name, color_key, sort_order)
values
  ('Сфера услуг', 'cyan', 10),
  ('Торговля', 'green', 20),
  ('Промышленность', 'violet', 30),
  ('Недвижимость', 'orange', 40),
  ('Производство', 'indigo', 50),
  ('Инфраструктура', 'teal', 60),
  ('Социальный', 'rose', 70),
  ('СКМ', 'blue-violet', 80),
  ('Транспорт', 'blue-gray', 90),
  ('ОПК', 'navy', 100)
on conflict (name) do update
set
  color_key = excluded.color_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
