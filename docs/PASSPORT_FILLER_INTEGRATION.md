# Passport Filler Integration Runbook

## Назначение

Интеграция подключает внешний `passport_filler` API к карточке проекта в `aij-project-console`:

- запуск автозаполнения из UI проекта;
- опрос статуса обработки;
- скачивание итогового файла с внешнего сервиса;
- загрузка результата в Supabase Storage как новой версии паспорта;
- фиксация изменений в `project_changes`.

## Переменные окружения

Добавьте в `.env.local` (и в Vercel для Preview/Production):

```bash
PASSPORT_FILLER_ENABLED=true
PASSPORT_FILLER_BASE_URL=http://127.0.0.1:8010
PASSPORT_FILLER_API_PREFIX=/api
PASSPORT_FILLER_API_TOKEN=
PASSPORT_FILLER_TIMEOUT_MS=30000
PASSPORT_FILLER_RETRY_COUNT=2
```

`PASSPORT_FILLER_API_TOKEN` опционален, но рекомендован для продакшена.

## API контракт (минимум для текущего этапа)

- `POST /api/projects/manual`  
  Создает удаленный проект из payload формата `ProjectInput`, возвращает `{ id }`.
- `POST /api/projects/{id}/start`  
  Ставит задачу в очередь, возвращает `{ queued: true }`.
- `GET /api/projects/{id}`  
  Возвращает текущее состояние пайплайна (`status`, `working`, `final_assessment`, `error`).
- `GET /api/projects/{id}/passport.xlsx`  
  Возвращает итоговый `.xlsx` паспорт.

## Поведение UI

1. В режиме редактирования проекта появляется кнопка `Автозаполнить паспорт`.
2. UI показывает промежуточный статус (`queued/processing/improve_loop`).
3. При `completed` backend автоматически:
   - скачивает `.xlsx` из внешнего сервиса;
   - пишет файл в `project-files` bucket;
   - создаёт новую запись версии в `project_files`;
   - обновляет поля проекта из `working`/`final_assessment`.
4. Ручная загрузка паспорта остается доступной как fallback.

## Rollout

1. **Stage 1:** включить `PASSPORT_FILLER_ENABLED=true` только в dev/staging.
2. **Stage 2:** дать доступ ограниченно роли `admin`.
3. **Stage 3:** после проверки стабильности открыть для `editor`.
4. **Stage 4:** мониторить `project_changes` события с `source='passport_filler'`.

## Проверка после деплоя

1. Открыть `/projects/{id}` под `admin` или `editor`.
2. Нажать `Редактировать проект`.
3. Нажать `Автозаполнить паспорт`.
4. Дождаться сообщения об успехе.
5. Проверить:
   - новый файл в `project_files` с `file_type='passport'` и `is_current=true`;
   - предыдущая версия стала `is_current=false`;
   - в `project_changes` есть записи с `source='passport_filler'`;
   - паспорт скачивается кнопкой `Скачать паспорт`.

## Типовые сбои

- `Passport filler integration is disabled`  
  Не включен `PASSPORT_FILLER_ENABLED`.
- `Не удалось запустить автозаполнение`  
  Сервис недоступен, неверный URL или токен.
- `Нельзя завершить автозаполнение`  
  Внешний статус еще не `completed` или вернулся `failed/escalated/revise`.
