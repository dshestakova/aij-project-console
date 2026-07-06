# Supabase Setup Guide

Эта инструкция описывает ручное создание Supabase project для AIJ Project Console.

Supabase нужен для:

- Postgres database;
- Auth для login/password без публичной самостоятельной регистрации;
- Storage для файлов проектов;
- migrations и schema changes в следующих PR;
- будущих RLS/storage policies после отдельного явного approval.

Официальные источники:

- Supabase Getting Started: https://supabase.com/docs/guides/getting-started
- Supabase with Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control

## Что не делаем на этом шаге

- Не подключаем Supabase SDK в коде.
- Не добавляем реальные environment variables.
- Не создаем database schema.
- Не создаем migrations.
- Не включаем и не меняем RLS policies.
- Не создаем Storage policies.
- Не подключаем Auth flow в приложении.
- Не коммитим `.env.local`, токены, project passwords или secret keys.

## Перед началом

Проверь, что:

- Vercel project создан;
- production deploy работает;
- GitHub `main` остается production branch;
- у тебя есть Supabase account.

## Создание Supabase project

1. Открой https://supabase.com/dashboard.
2. Нажми `New project`.
3. Выбери organization или создай новую.
4. Project name: `aij-project-console`.
5. Database password:
   - сгенерируй надежный пароль;
   - сохрани его в password manager;
   - не присылай его в чат;
   - не коммить его в репозиторий.
6. Region:
   - выбери ближайший разумный регион к основным пользователям;
   - если нет строгого требования, можно выбрать европейский регион.
7. Нажми `Create new project`.
8. Дождись, пока проект станет активным.

## Auth настройки

Цель MVP: login/password access без публичной самостоятельной регистрации.

Пока ничего не подключай в коде. В Supabase dashboard проверь раздел Auth:

1. Открой `Authentication`.
2. Открой `Providers`.
3. Проверь Email provider.
4. Найди настройку, отвечающую за самостоятельную регистрацию новых пользователей.
5. Для будущего MVP нам нужно отключить public self-signup, чтобы пользователей создавал admin.

Важно:

- Не создавай пользователей до отдельного Auth PR.
- Не меняй дополнительные security-sensitive настройки без отдельного обсуждения.
- Не включай social login providers.
- Не включай magic link как основной flow, если мы отдельно это не согласовали.

На следующем Auth PR мы отдельно опишем:

- как admin создает пользователей;
- как пользователь получает password;
- как roles `admin`, `editor`, `viewer` будут храниться в `profiles`;
- какие redirect URLs нужны для Vercel Production и Preview.

## Storage настройки

Для файлов проектов нам нужен private bucket.

Пока можно создать bucket заранее, но policies не настраивать до отдельного security/RLS PR.

Рекомендуемый bucket:

- Name: `project-files`
- Public: `false`
- Purpose: файлы проектов, связанные с `project_files`

Почему private:

- файлы проектов могут быть чувствительными;
- public bucket делает файлы доступными по URL;
- private bucket требует access control или signed URLs.

Важно:

- Не создавай permissive policies вроде `true` для всех пользователей.
- Не делай bucket public.
- Storage policies будем писать отдельным migration/security PR.

## API keys и environment variables

В Supabase открой Project Settings и найди API/Connect settings.

Нам понадобятся:

- Project URL;
- browser-safe key для client-side операций;
- server-only secret key для server-side операций.

В текущем `.env.example` есть такие placeholders:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Нюанс по названиям:

- Supabase сейчас рекомендует ключи `publishable` и `secret`.
- Используем актуальные env names: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `SUPABASE_SECRET_KEY`.

Правила безопасности:

- `NEXT_PUBLIC_SUPABASE_URL` можно использовать в browser.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` можно использовать в browser.
- `SUPABASE_SECRET_KEY` нельзя использовать в browser.
- server-only key нельзя добавлять в React components.
- server-only key нельзя присылать в чат.
- server-only key нельзя коммитить.

## Локальный `.env.local`

После создания Supabase project локально нужно будет создать файл `.env.local`.

Не делай это сейчас, если мы еще не пишем код подключения.

Когда я попрошу, файл будет выглядеть примерно так:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

Файл `.env.local` должен оставаться только локально. Он уже должен игнорироваться `.gitignore`.

## Vercel Environment Variables

Когда будем подключать Supabase в коде, эти значения нужно будет добавить в Vercel:

1. Открой Vercel dashboard.
2. Выбери project `aij-project-console`.
3. Открой `Settings`.
4. Открой `Environment Variables`.
5. Добавь значения для Preview и Production.

Для первого read-only/client setup обычно понадобятся:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Для server-side admin operations позже понадобится:

- `SUPABASE_SECRET_KEY`

Важно:

- Не добавляй server-only key, пока он не нужен коду.
- Не добавляй GigaChat keys на этом этапе.
- После изменения Vercel env variables обычно нужен новый deployment.

## Что прислать Codex после настройки

После создания Supabase project напиши в чат:

- Supabase project создан;
- region выбран;
- project URL, если готова делиться URL;
- создан ли bucket `project-files`;
- настроены ли Vercel env variables или пока нет;
- хочешь ли ты следующим PR делать Supabase client foundation или Auth foundation.

Не присылай:

- database password;
- access tokens;
- secret keys;
- service role key;
- `.env.local`;
- screenshots с открытыми secret values.

## Проверка после настройки

На этом documentation-only этапе проверка ручная:

- Supabase project открыт в dashboard;
- project status active;
- API/Connect settings доступны;
- Auth settings доступны;
- Storage раздел доступен;
- если bucket создан, он private.

Кодовую проверку подключения мы добавим только в следующем PR после твоего подтверждения.

## Следующий PR после настройки

Рекомендуемый следующий безопасный PR:

- установить Supabase packages;
- добавить server/client Supabase helpers;
- добавить env validation без раскрытия secret values;
- добавить health-check страницу или server action без чтения реальных таблиц.

Auth, RLS, Storage policies и database schema должны идти отдельными PR и требовать явного approval.
