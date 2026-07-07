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

Ожидаемые колонки текущего Google Sheets-реестра:

```csv
ID проекта,Кластер,№ в кластере,№ исходный,Клиент,Название проекта,Суть проекта,Срок реализации,Тип срока,Прогресс реализации,Статус,Риск,Причина риска,Следующий шаг,Финансирование статус,Финансирование комментарий,Спонсор проекта,Партнер,Статья/мероприятие,CSM,Директор,Отраслевое управление,Флагман,AIJ метка исходная,Дата последнего обновления,Обновил,Архив,Комментарий
```

Минимально обязательное значение для записи в базу:

- `ID проекта`

Если `ID проекта` пустой, скрипт использует fallback `№ исходный`. Если обе колонки пустые, dry-run покажет blocking validation issue.

Остальные бизнес-поля считаются опциональными на первом импорте. Пустые значения можно будет заполнить позже в интерфейсе или следующим импортом.

Рекомендуемые колонки для качества данных, но не блокеры импорта:

- `client`
- `project_name`
- `cluster`
- `status`
- `next_step`

## Mapping

| CSV header | Supabase field |
| --- | --- |
| `ID проекта` | `projects.external_id` |
| `№ исходный` | fallback for `projects.external_id` |
| `Клиент` | `projects.client` |
| `Название проекта` | `projects.project_name` |
| `Кластер` | `clusters.name` -> `projects.cluster_id` |
| `Статус` | `project_statuses.name` -> `projects.status_id` |
| `Суть проекта` | `projects.essence` |
| `Прогресс реализации` | `projects.progress` |
| `Следующий шаг` | `projects.next_step` |
| `Финансирование статус` | `projects.funding_status` |
| `Финансирование комментарий` | `projects.funding` |
| `CSM` | `people.full_name` where `person_type = csm` -> `projects.csm_id` |
| `Директор` | `people.full_name` where `person_type = director` -> `projects.director_id` |
| `Отраслевое управление` | `industry_units.name` -> `projects.industry_unit_id` |
| `Флагман` | `projects.is_flagship` |
| `Архив` | `projects.is_archived` |
| `Комментарий` | `projects.comment` |
| `Дата последнего обновления` | `projects.updated_at` if safely parseable, otherwise import timestamp |

The full original CSV row is stored in `projects.source_payload` during real import.

## Empty optional values

Источник может содержать пустые ячейки в большинстве колонок. Это нормально для первого импорта.

Для текстовых полей скрипт считает пустыми:

- пустую ячейку;
- пробелы;
- `-`;
- `—`;
- `–`;
- `нет`;
- `нет данных`;
- `n/a`;
- `na`;
- `none`;
- `null`.

Такие значения сохраняются в payload проекта как `null` и не блокируют импорт. Это относится к:

- `client`;
- `project_name`;
- `essence`;
- `progress`;
- `next_step`;
- `funding`;
- `funding_status`;
- `comment`.

Для `Флагман` и `Архив` пустая ячейка означает `false`.

Для `Дата последнего обновления`:

- если значение есть и безопасно парсится, оно попадет в `projects.updated_at`;
- если значение пустое, некорректное или непонятное, скрипт использует timestamp запуска импорта;
- `projects.updated_at` никогда не отправляется как `null`;
- исходное значение из CSV все равно сохраняется в `projects.source_payload`.

## Legacy value aliases

Некоторые значения в Google Sheets отличаются от текущих справочников Supabase. Скрипт использует aliases только для поиска reference ID, а исходные значения сохраняет в `projects.source_payload`.

Cluster aliases:

- `Соц` -> `Социальный`

Project status aliases:

- `идея` -> `идея/КП`
- `в работе` -> `в разработке`
- `в проработке` -> `уточнение ТЗ`

Проверить aliases на синтетическом CSV можно без Supabase:

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/alias-test.csv --self-test-aliases
```

Проверить обработку пустых опциональных значений можно без Supabase:

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/empty-values-test.csv --self-test-empty-values
```

## Что делает импорт

Скрипт `scripts/import-projects-csv.mjs`:

- читает CSV;
- проверяет обязательные поля;
- проверяет дубли `external_id` внутри файла;
- превращает пустые опциональные текстовые значения в `null`;
- подставляет timestamp запуска импорта в `updated_at`, если дата из CSV пустая или не парсится;
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
- сохраняет полный исходный CSV row в `projects.source_payload`.

## Migration for source payload

Перед реальным импортом нужно применить migration:

```bash
supabase/migrations/20260706201000_add_project_source_payload.sql
```

Самый простой MVP-способ:

1. Откройте Supabase Dashboard.
2. Откройте проект.
3. Перейдите в SQL Editor.
4. Вставьте содержимое migration.
5. Нажмите Run.

Migration не удаляет данные и только добавляет nullable `projects.source_payload jsonb`, если колонки еще нет.

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

Проверить только CSV-заголовки и правило `ID проекта` / `№ исходный` можно без Supabase:

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --validate-csv-only
```

Эта команда не читает базу и ничего не пишет.

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --dry-run
```

Проверьте:

- сколько строк найдено;
- нет ли пустых `external_id`;
- нет ли дублей `external_id`;
- сколько строк использует fallback `updated_at`;
- сколько пустых опциональных текстовых значений найдено;
- нет ли unmatched clusters/statuses/flagship statuses;
- какие CSM/director/industry units будут созданы при реальном импорте.

Ожидаемый успешный dry-run выглядит примерно так:

```text
Mode: dry-run
Rows found: 123
Rows with external_id: 123
Rows with fallback updated_at: 12
Empty optional text values: 37

Dry-run finished. No database writes were made.
```

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
