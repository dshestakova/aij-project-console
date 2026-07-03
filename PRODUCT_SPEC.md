# AIJ Project Console Product Spec

## Product Overview

AIJ Project Console is a closed web interface for managing the AIJ project registry.

The product will replace neither the current Telegram bot nor the current Google Apps Script MVP directly. The existing MVP based on Telegram bot, Cloudflare Worker, Google Apps Script, and Google Sheets must remain separate and stable while this repository evolves into a full private web product.

## Target Users

### Admin

- Manages users.
- Can edit all projects.
- Can upload and delete project files.
- Can export project data.
- Can later manage reference data and system settings.

### Editor

- Can view and edit projects.
- Can update next steps.
- Can upload and delete project files.
- Can export project data.

### Viewer

- Can view projects, history, and files.
- Can download files.
- Can export project data in the MVP.
- Cannot edit projects or delete files.

## Access Model

- Private login page.
- Login/password access.
- No public self-registration.
- Users are created manually by admin.
- Passwords must be handled by a proper auth provider, not stored manually in application tables, code, or documents.
- Protected dashboard after login.

## Core Product Functions

### Login and Access Control

- Private login page.
- Role-based access control for `admin`, `editor`, and `viewer`.
- Protected dashboard and project pages.
- Future admin controls for users and permissions.

### Project Registry

- Dashboard summary:
  - total projects;
  - flagship projects;
  - status distribution.
- Search by:
  - project ID;
  - client;
  - project name;
  - project essence or description.
- Filters:
  - flagship;
  - CSM;
  - director;
  - cluster;
  - status;
  - archive state.
- Project cards as the primary registry view.
- Mobile-friendly interface.

### Project Clusters

Known clusters:

- Сфера услуг
- Торговля
- Промышленность
- Недвижимость
- Производство
- Инфраструктура
- Социальный
- СКМ
- Транспорт

Unknown, empty, or unmatched cluster values should be mapped to a neutral "не указан" value with gray styling.

Cluster color should apply to:

- project ID;
- project title;
- cluster badge;
- subtle project card accent.

Clusters should be stored as reference data so they can be changed later through admin settings.

### Project Statuses

Initial project statuses:

- идея/КП
- факт оплаты
- уточнение ТЗ
- в разработке
- на паузе

Initial color direction:

- идея/КП: light amber;
- факт оплаты: green;
- уточнение ТЗ: blue;
- в разработке: purple or blue;
- на паузе: gray-blue or neutral gray;
- empty or unknown: gray.

Statuses should be stored as reference data, not hard-coded as irreversible business logic.

### Flagship Tracking

Flagship tracking is separate from the main project status.

Fields:

- `is_flagship`: whether the project is a flagship project.
- `flagship_status`: optional stage of the flagship process.

Initial flagship statuses:

- очередь на паспорт
- заполнение паспорта
- внесен на ПРБР

Interface rules:

- Do not show a negative "нет" badge for non-flagship projects.
- If a project is flagship, show a "Флагман" badge.
- If a flagship project has `flagship_status`, show an additional badge for that value.

### Project Detail

Each project should have a detailed view containing:

- ID проекта
- Клиент
- Название проекта
- Кластер
- Статус
- Флагман
- Флагманский статус
- CSM
- Директор
- Отраслевое управление
- Суть проекта / описание
- Прогресс реализации
- Следующий шаг
- Финансирование
- Финансирование статус
- Комментарий
- Дата последнего обновления
- История изменений
- Файлы проекта

### Editing

The first important editing flow is updating "Следующий шаг".

Business rule:

- When a user updates "Следующий шаг", the old value must be appended to the end of "Прогресс реализации".
- The new text becomes the new "Следующий шаг".
- Existing "Прогресс реализации" must not be overwritten.
- The change must be written to project history.
- History must show user, date/time, field, old value, and new value.

Later editing:

- Edit other project fields.
- Archive projects.
- Bulk updates if needed.

### Project Change History

Every meaningful project change should be logged with:

- project ID;
- user;
- date/time;
- field changed;
- old value;
- new value;
- source;
- comment.

History must be visible inside each project detail page.

### User Activity History

The system should also keep activity logs separate from project change history.

Examples:

- login events;
- exports;
- file uploads;
- file deletions;
- future admin actions.

For the MVP, the table should be planned early, even if only a subset of events is implemented at first.

### File Attachments

Each project should support file attachments:

- upload file;
- show file list;
- download or open file;
- delete file if role allows;
- connect files to the stable project ID.

Files should be stored in Supabase Storage or another approved object storage mechanism. Files must not be stored directly in the database.

### Export

MVP export:

- CSV export of the full project table for authenticated users.

Later:

- filtered export;
- XLSX export if practical;
- optional `can_export` permission.

### AI Analyst

GigaChat integration will be added later, after the base product is stable.

Example questions:

- "Какая ситуация с проектами в услугах?"
- "Какие проекты без следующего шага?"
- "Какие флагманы сейчас требуют внимания?"
- "Покажи распределение проектов по статусам."
- "Сформируй краткую сводку по проекту."

Important constraints:

- GigaChat key must never be exposed to the browser.
- AI calls must go through server-side API routes.
- Usage limits and logging should be added later.
- Do not implement GigaChat in the first phase.

## Design Direction

- Russian UI.
- Clean light interface.
- Mobile-first.
- White cards.
- Rounded corners.
- Calm colors.
- No stock images.
- No visual clutter.
- Product-like dashboard, not spreadsheet UI.

## Import Direction

- Initial data will come from the current Google Sheets registry via CSV/XLSX import.
- No live Google Sheets integration in the first phase.
- Current external project IDs must be preserved as stable identifiers.
- Import should handle unknown or empty reference values carefully.

