# AIJ Project Console Data Model

## Principles

- Use internal UUID primary keys for database relations.
- Preserve the current external project code as a stable displayed identifier.
- Use reference tables for statuses, industry units, flagship statuses, and responsible people.
- Keep project changes separate from broader user activity logs.
- Use soft archiving for projects instead of physical deletion.
- Store files in object storage and keep only metadata in the database.
- Use migrations for all schema changes.

## Tables

### `profiles`

Application profile connected to the auth provider user.

Fields:

- `id` uuid primary key, references auth user id.
- `email` text.
- `display_name` text.
- `role` text: `admin`, `editor`, `viewer`.
- `created_at` timestamptz.
- `updated_at` timestamptz.

Notes:

- Passwords are managed by Supabase Auth, not this table.
- A future `can_export` permission can be added if export rules become more granular.

### `projects`

Main project registry table.

Fields:

- `id` uuid primary key.
- `external_id` text, stable visible project code such as `AIJ-П-001`.
- `client` text.
- `project_name` text.
- `cluster_id` uuid, nullable, references `clusters.id`. Deprecated compatibility field; product UI and analytics use `industry_unit_id`.
- `status_id` uuid, references `project_statuses.id`.
- `is_flagship` boolean.
- `flagship_status_id` uuid, nullable, references `flagship_statuses.id`.
- `csm_id` uuid, nullable, references `people.id`.
- `director_id` uuid, nullable, references `people.id`.
- `industry_unit_id` uuid, nullable, references `industry_units.id`.
- `essence` text.
- `progress` text.
- `next_step` text.
- `funding` text.
- `funding_status` text.
- `is_social` boolean, financing/social marker, default `false`.
- `comment` text.
- `source_payload` jsonb, nullable.
- `is_archived` boolean.
- `archived_at` timestamptz, nullable.
- `archived_by` uuid, nullable, references `profiles.id`.
- `created_at` timestamptz.
- `updated_at` timestamptz.

Notes:

- `external_id` should be unique when present.
- Archived projects are hidden from the main registry by default and available through a filter.
- Search should work across Russian and English text.
- When `next_step` is updated later, the old `next_step` should be appended to `progress`, the new value should be saved into `next_step`, and a `project_changes` row should be created. This flow is documented here but is not implemented in the initial schema PR.
- `source_payload` preserves the original CSV row from the import workflow so source-only fields are not lost.

### `project_statuses`

Reference table for project statuses.

Initial values:

- `идея/КП`
- `факт оплаты`
- `уточнение ТЗ`
- `в разработке`
- `на паузе`

Fields:

- `id` uuid primary key.
- `name` text.
- `color_key` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamptz.
- `updated_at` timestamptz.

### `flagship_statuses`

Reference table for flagship process stages.

Initial values:

- `очередь на паспорт`
- `заполнение паспорта`
- `внесен на ПРБР`

Fields:

- `id` uuid primary key.
- `name` text.
- `color_key` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamptz.
- `updated_at` timestamptz.

### `clusters`

Deprecated compatibility reference table for old cluster values. It is kept for safe backward compatibility and importer/source preservation, but current product UI, analytics, filters, and export use `industry_units`.

Initial values:

- `Сфера услуг`
- `Торговля`
- `Промышленность`
- `Недвижимость`
- `Производство`
- `Инфраструктура`
- `Социальный`
- `СКМ`
- `Транспорт`

Fields:

- `id` uuid primary key.
- `name` text.
- `color_key` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamptz.
- `updated_at` timestamptz.

### `people`

Recommended shared reference table for responsible people who are not necessarily application users.

Fields:

- `id` uuid primary key.
- `full_name` text.
- `person_type` text: `csm`, `director`.
- `email` text, nullable.
- `is_active` boolean.
- `created_at` timestamptz.
- `updated_at` timestamptz.

Reasoning:

- CSM and directors are reference values, not only free text on `projects`.
- The initial schema keeps a simple `person_type` field. If one person needs multiple responsibility types later, a separate role mapping table can be added in a future migration.
- Application users stay in `profiles`; external or business responsible people stay in `people`.

### `industry_units`

Reference table for industry departments. This is the single true project classification field for the product.

Active product values:

- `Сфера услуг`
- `Торговля`
- `Промышленность`
- `Недвижимость`
- `Производство`
- `Инфраструктура`
- `Социальный`
- `СКМ`
- `Транспорт`

Notes:

- `ОПК` is treated as the same business unit as `СКМ`; projects are reassigned to `СКМ`, and `ОПК` is not shown as an active option.
- `Социальный` here is an industry unit. The separate `projects.is_social` field is a financing/social marker.

Fields:

- `id` uuid primary key.
- `name` text.
- `color_key` text, nullable.
- `sort_order` integer, nullable.
- `is_active` boolean.
- `created_at` timestamptz.
- `updated_at` timestamptz.

### `director_csm_assignments`

Organizational assignment table for director-CSM-industry analytics.

Fields:

- `id` uuid primary key.
- `external_id` text, unique stable assignment code from the source system.
- `director_id` uuid, nullable, references `people.id`.
- `director_name` text.
- `industry_unit_id` uuid, nullable, references `industry_units.id`.
- `industry_unit_name` text.
- `csm_id` uuid, nullable, references `people.id`.
- `csm_name` text.
- `is_active` boolean.
- `comment` text, nullable.
- `sort_order` integer, nullable.
- `created_at` timestamptz.
- `updated_at` timestamptz.
- `updated_by` uuid, nullable, references `profiles.id`.

Notes:

- One active row represents one CSM assignment to one director and one industry unit.
- The table is designed for a later CSV or Google Sheets load; this PR does not add an assignment importer.
- Portfolio analytics reads active assignments when present and falls back to project-level `director_id`, `csm_id`, and `industry_unit_id` fields when the table is empty.

### `project_changes`

History of meaningful project changes.

Fields:

- `id` uuid primary key.
- `project_id` uuid, references `projects.id`.
- `changed_by` uuid, references `profiles.id`.
- `changed_at` timestamptz.
- `field_name` text.
- `old_value` text.
- `new_value` text.
- `source` text.
- `comment` text.

Notes:

- The first critical use case is logging updates to `next_step`.
- The `next_step` update flow must also append the old next step to `projects.progress`.

### `project_files`

Metadata for files attached to projects.

Fields:

- `id` uuid primary key.
- `project_id` uuid, references `projects.id`.
- `file_name` text.
- `storage_path` text.
- `mime_type` text.
- `size_bytes` bigint.
- `uploaded_by` uuid, references `profiles.id`.
- `uploaded_at` timestamptz.
- `deleted_at` timestamptz, nullable.
- `deleted_by` uuid, nullable, references `profiles.id`.

Notes:

- Files are stored in Supabase Storage or another approved object storage service.
- Viewer can view and download files.
- Admin and editor can upload and delete files.

### `audit_log`

System activity log separate from project field changes.

Fields:

- `id` uuid primary key.
- `user_id` uuid, nullable, references `profiles.id`.
- `action` text.
- `entity_type` text.
- `entity_id` uuid, nullable.
- `metadata` jsonb.
- `created_at` timestamptz.

Example events:

- login;
- logout;
- export_projects;
- upload_file;
- delete_file;
- ai_query.

### `ai_queries`

Future logging table for GigaChat analyst usage.

Fields:

- `id` uuid primary key.
- `user_id` uuid, references `profiles.id`.
- `question` text.
- `response_summary` text.
- `token_usage` jsonb.
- `created_at` timestamptz.

## Initial Reference Data

`project_statuses`:

- `идея/КП` with `amber`.
- `факт оплаты` with `green`.
- `уточнение ТЗ` with `blue`.
- `в разработке` with `violet`.
- `на паузе` with `gray`.

`flagship_statuses`:

- `очередь на паспорт`.
- `заполнение паспорта`.
- `внесен на ПРБР`.

`industry_units`:

- `Сфера услуг`.
- `Торговля`.
- `Промышленность`.
- `Недвижимость`.
- `Производство`.
- `Инфраструктура`.
- `Социальный`.
- `СКМ`.
- `Транспорт`.
- `ОПК` is deprecated and merged into `СКМ`.

## RLS Baseline

- Anonymous users have no table access.
- Authenticated users can read reference data and project data.
- `profiles` are readable by the owner and by admins.
- Reference tables are writable only by admins.
- `projects`, `project_changes`, and `project_files` are writable by admins and editors.
- `director_csm_assignments` active rows are readable by authenticated users and writable by admins/editors.
- Physical deletes for projects, changes, and file metadata are intentionally not exposed; project archiving and file soft deletion should use updates.
- `audit_log` is readable only by admins in the initial policy set.
- `ai_queries` are readable by the owning user and admins; users may insert their own future query records.
- The first admin profile must be created manually after applying migrations because public self-registration and self-assigned roles are intentionally not allowed.

Notes:

- GigaChat is not implemented in the first phase.
- API keys must remain server-side only.
- Daily usage limits can be built on top of this table later.

## Initial Access Matrix

| Capability | Admin | Editor | Viewer |
| --- | --- | --- | --- |
| View projects | Yes | Yes | Yes |
| Export projects | Yes | Yes | Yes |
| Edit projects | Yes | Yes | No |
| Update next step | Yes | Yes | No |
| View history | Yes | Yes | Yes |
| Upload files | Yes | Yes | No |
| Delete files | Yes | Yes | No |
| Manage users | Yes | No | No |
| Manage reference data | Yes | No | No |
