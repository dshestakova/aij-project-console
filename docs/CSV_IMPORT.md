# CSV Import

Этот workflow нужен для безопасного локального импорта текущего реестра проектов из CSV в Supabase.

В этом PR нет browser upload, реальных данных, GigaChat, изменений схемы или секретов в коде.

## Как экспортировать CSV из Google Sheets

1. Откройте текущий Google Sheets-реестр.
2. Проверьте, что первая строка содержит названия колонок.
3. Оставьте только лист с проектами, который нужно импортировать.
4. Откройте `File -> Download -> Comma Separated Values (.csv)`.
5. Сохраните файл локально вне git-репозитория, например:

```bash
/private/tmp/aij-project-import/projects.csv
```

Не кладите реальные CSV-выгрузки в git и не отправляйте их в чат.

## CSV template

Шаблон заголовков лежит здесь:

```bash
docs/project-import-template.csv
```

Ожидаемые колонки:

```csv
external_id,client,project_name,cluster,status,is_flagship,flagship_status,csm,director,industry_unit,essence,progress,next_step,funding,funding_status,comment,is_archived
```

Минимально обязательная колонка для записи в базу:

- `external_id`

Рекомендуемые колонки для качества данных:

- `client`
- `project_name`
- `cluster`
- `status`
- `next_step`

Скрипт также понимает часть русских заголовков, например `Клиент`, `Проект`, `Кластер`, `Статус`, `Следующий шаг`, `Флагман`.

## Что делает импорт

Скрипт `scripts/import-projects-csv.mjs`:

- читает CSV;
- проверяет обязательные поля;
- проверяет дубли `external_id` внутри файла;
- сопоставляет справочники по названию:
  - `cluster` -> `clusters.name`;
  - `status` -> `project_statuses.name`;
  - `flagship_status` -> `flagship_statuses.name`;
  - `csm` -> `people.full_name` with `person_type = csm`;
  - `director` -> `people.full_name` with `person_type = director`;
  - `industry_unit` -> `industry_units.name`;
- в dry-run показывает проблемы и ничего не пишет;
- в import mode создает недостающих CSM/director и industry units;
- не создает недостающие clusters/statuses/flagship statuses, а останавливает импорт;
- upsert-ит проекты по `external_id`, поэтому повторный импорт того же `external_id` обновит проект, а не создаст дубль.

## Env variables

Для dry-run и реального импорта нужен локальный `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` нужен только локальному server-side import script, потому что импорт должен обходить пользовательские RLS-права безопасно и предсказуемо. Этот ключ нельзя использовать в browser/client code, нельзя коммитить и нельзя отправлять в чат.

`.env.local` уже игнорируется git.

## Dry-run

Dry-run ничего не пишет в базу.

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --dry-run
```

Проверьте:

- сколько строк найдено;
- нет ли пустых `external_id`;
- нет ли дублей `external_id`;
- нет ли unmatched clusters/statuses/flagship statuses;
- какие CSM/director/industry units будут созданы при реальном импорте.

## Real import

Запускайте только после чистого dry-run.

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --import
```

Import mode:

- создает недостающих людей (`people`) для CSM/director;
- создает недостающие отраслевые управления (`industry_units`);
- upsert-ит проекты по `external_id`.

## RLS and security

В приложении RLS остается включенным.

Для CLI-импорта используется локальный server-side ключ из `.env.local`, чтобы:

- не выдавать browser-коду повышенные права;
- не менять RLS policies ради разового импорта;
- не зависеть от роли текущего пользователя в UI;
- не коммитить секреты.

## Known limitations

- Скрипт не импортирует файлы.
- Скрипт не пишет `project_changes`.
- Скрипт не запускает next-step business flow.
- Скрипт не создает новые clusters/statuses/flagship statuses.
- CSV должен быть в UTF-8.
- Перед импортом лучше привести названия справочников к тем, что уже есть в Supabase.
