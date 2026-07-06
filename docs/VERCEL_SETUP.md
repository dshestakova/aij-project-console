# Vercel Setup Guide

Эта инструкция описывает ручное подключение AIJ Project Console к Vercel.

Vercel нужен для:

- preview-деплоев по pull request;
- production-деплоя после merge в `main`;
- хранения environment variables для Preview и Production;
- проверки интерфейса по внешней ссылке без локального запуска.

Официальные источники:

- Vercel Git deployments: https://vercel.com/docs/git
- Vercel Next.js docs: https://vercel.com/docs/frameworks/full-stack/nextjs
- Vercel Environment Variables: https://vercel.com/docs/environment-variables

## Что не делаем на этом шаге

- Не подключаем Supabase.
- Не добавляем реальные environment variables.
- Не добавляем GigaChat.
- Не меняем auth, RLS или security rules.
- Не коммитим `.env.local`, `.env`, токены или ключи.

## Перед началом

Проверь, что:

- PR с Next.js app shell уже смержен в `main`;
- в GitHub repository default branch = `main`;
- у тебя есть Vercel account;
- Vercel account связан с GitHub account `dshestakova` или имеет доступ к private repo.

## Создание проекта в Vercel

1. Открой https://vercel.com/dashboard.
2. Нажми `Add New...` или `New Project`.
3. В списке GitHub repositories выбери `dshestakova/aij-project-console`.
4. Если Vercel не видит репозиторий:
   - нажми настройку GitHub integration/access;
   - разреши доступ к private repository `aij-project-console`;
   - вернись к импорту проекта.

## Настройки импорта

Выбери такие настройки:

- Framework Preset: `Next.js`.
- Root Directory: оставить корень репозитория (`./`).
- Build Command: оставить default для Next.js, обычно `npm run build`.
- Install Command: оставить default, обычно `npm install`.
- Output Directory: оставить default, не заполнять вручную.
- Production Branch: `main`.

На этом этапе environment variables можно не добавлять.

## Первый Deploy

1. Нажми `Deploy`.
2. Дождись завершения сборки.
3. Открой production URL, который выдаст Vercel.
4. Проверь:
   - открывается главная страница;
   - `/` перенаправляет на `/dashboard`;
   - на `/dashboard` виден заголовок `Реестр AIJ-проектов`;
   - видны summary cards, статусы, поиск, фильтры и пустое состояние проектов.

## Preview Deployments

После подключения Vercel каждый следующий pull request должен получать preview deployment.

Обычный процесс:

1. Codex создает ветку `codex/...`.
2. Codex открывает PR в GitHub.
3. Vercel автоматически запускает preview deployment для PR.
4. Ты открываешь preview-ссылку из GitHub PR или Vercel dashboard.
5. Проверяешь UI/поведение.
6. После approval PR можно merge в `main`.
7. Vercel создает production deployment из `main`.

## Environment Variables

Позже, когда появятся Supabase и GigaChat, значения нужно будет добавлять в Vercel Project Settings, а не в код.

Ожидаемые переменные из `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `GIGACHAT_AUTH_KEY`
- `GIGACHAT_SCOPE`
- `GIGACHAT_API_URL`

Правила:

- `NEXT_PUBLIC_*` значения доступны браузеру, поэтому туда нельзя класть server-only secrets.
- `SUPABASE_SECRET_KEY` должен быть только server-side.
- `GIGACHAT_AUTH_KEY` должен быть только server-side.
- Реальные значения не присылать в чат.
- Реальные значения не коммитить.
- Локально реальные значения хранить в `.env.local`.
- В Vercel реальные значения хранить в Project Settings -> Environment Variables.

Для MVP после подключения Supabase обычно нужно будет добавить переменные как минимум в Preview и Production environments.

## Что прислать Codex после настройки

После успешного подключения Vercel напиши в чат:

- что Vercel project создан;
- что production deploy прошел;
- production URL;
- работает ли `/dashboard`;
- появилась ли Vercel preview-ссылка в следующем PR.

Не присылай:

- secret keys;
- auth tokens;
- service role keys;
- `.env.local`;
- screenshots с открытыми secret values.

## Troubleshooting

### Vercel не видит репозиторий

Проверь GitHub integration permissions в Vercel и разреши доступ к private repository `dshestakova/aij-project-console`.

### Build не проходит

Проверь build log в Vercel.

Ожидаемый локальный baseline:

```bash
npm run lint
npm run typecheck
npm run build
```

Если локально эти команды проходят, а Vercel падает, пришли текст ошибки из Vercel build log без секретов.

### Production branch не `main`

В Vercel Project Settings проверь Production Branch и выставь `main`.

### Preview не появляется на PR

Проверь:

- проект подключен именно к `dshestakova/aij-project-console`;
- GitHub integration имеет доступ к repository;
- PR открыт из ветки в этом repository;
- автор коммита имеет доступ к Vercel project, если Vercel требует это для private repository.
