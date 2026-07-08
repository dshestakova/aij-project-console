alter table public.project_files
  add column if not exists file_type text not null default 'other',
  add column if not exists version_number integer,
  add column if not exists is_current boolean not null default true,
  add column if not exists description text;

create index if not exists project_files_passport_current_idx
  on public.project_files(project_id, file_type, is_current, uploaded_at desc)
  where deleted_at is null;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-files',
  'project-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_files_authenticated_read'
  ) then
    create policy "project_files_authenticated_read"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'project-files');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_files_admin_editor_insert'
  ) then
    create policy "project_files_admin_editor_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'project-files'
      and public.is_admin_or_editor()
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'project_files_admin_editor_update'
  ) then
    create policy "project_files_admin_editor_update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'project-files'
      and public.is_admin_or_editor()
    )
    with check (
      bucket_id = 'project-files'
      and public.is_admin_or_editor()
    );
  end if;
end;
$$;
