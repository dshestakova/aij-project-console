# AIJ Project Console Data Model

## Principles

- Use internal UUID primary keys for database relations.
- Preserve the current external project code as a stable displayed identifier.
- Use reference tables for statuses, clusters, flagship statuses, and responsible people.
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
- `full_name` text.
- `role` text or enum: `admin`, `editor`, `viewer`.
- `created_at` timestamp.
- `updated_at` timestamp.

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
- `cluster_id` uuid, references `clusters.id`.
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
- `comment` text.
- `is_archived` boolean.
- `archived_at` timestamp, nullable.
- `archived_by` uuid, nullable, references `profiles.id`.
- `created_at` timestamp.
- `updated_at` timestamp.

Notes:

- `external_id` should be unique when present.
- Archived projects are hidden from the main registry by default and available through a filter.
- Search should work across Russian and English text.

### `project_statuses`

Reference table for project statuses.

Initial values:

- `идея/КП`
- `факт оплаты`
- `уточнение ТЗ`
- `в разработке`
- `на паузе`
- `не указан`

Fields:

- `id` uuid primary key.
- `name` text.
- `slug` text.
- `color_token` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamp.
- `updated_at` timestamp.

### `flagship_statuses`

Reference table for flagship process stages.

Initial values:

- `очередь на паспорт`
- `заполнение паспорта`
- `внесен на ПРБР`

Fields:

- `id` uuid primary key.
- `name` text.
- `slug` text.
- `color_token` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamp.
- `updated_at` timestamp.

### `clusters`

Reference table for project clusters.

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
- `не указан`

Fields:

- `id` uuid primary key.
- `name` text.
- `slug` text.
- `color_token` text.
- `sort_order` integer.
- `is_active` boolean.
- `created_at` timestamp.
- `updated_at` timestamp.

### `people`

Recommended shared reference table for responsible people who are not necessarily application users.

Fields:

- `id` uuid primary key.
- `full_name` text.
- `email` text, nullable.
- `is_active` boolean.
- `created_at` timestamp.
- `updated_at` timestamp.

Related role mapping table:

- `person_roles`
  - `id` uuid primary key.
  - `person_id` uuid, references `people.id`.
  - `role` text: `csm`, `director`.
  - `created_at` timestamp.

Reasoning:

- A single `people` table avoids duplicating the same person across CSM and director lists.
- `person_roles` allows one person to have multiple responsibility types later.
- Application users stay in `profiles`; external or business responsible people stay in `people`.

### `industry_units`

Reference table for industry departments.

Fields:

- `id` uuid primary key.
- `name` text.
- `slug` text.
- `is_active` boolean.
- `sort_order` integer.
- `created_at` timestamp.
- `updated_at` timestamp.

### `project_changes`

History of meaningful project changes.

Fields:

- `id` uuid primary key.
- `project_id` uuid, references `projects.id`.
- `user_id` uuid, references `profiles.id`.
- `changed_at` timestamp.
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
- `storage_bucket` text.
- `storage_path` text.
- `file_name` text.
- `mime_type` text.
- `size_bytes` bigint.
- `uploaded_by` uuid, references `profiles.id`.
- `uploaded_at` timestamp.
- `deleted_at` timestamp, nullable.
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
- `event_type` text.
- `entity_type` text.
- `entity_id` uuid, nullable.
- `metadata` jsonb.
- `created_at` timestamp.

Example events:

- login;
- export;
- file upload;
- file delete;
- future admin actions.

### `ai_queries`

Future logging table for GigaChat analyst usage.

Fields:

- `id` uuid primary key.
- `user_id` uuid, references `profiles.id`.
- `question` text.
- `response_summary` text.
- `status` text.
- `metadata` jsonb.
- `created_at` timestamp.

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
| Manage reference data | Later | Later or no | No |

