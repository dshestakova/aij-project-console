# AIJ Project Console

AIJ Project Console is a private web application for managing the AIJ project registry.

This repository is for the future full web product. It is separate from the current MVP based on Telegram bot, Cloudflare Worker, Google Apps Script, and Google Sheets.

## Product Direction

The target product is a secure Russian-language web interface with:

- login/password access without public self-registration;
- roles: `admin`, `editor`, `viewer`;
- project registry with cards, search, filters, and summary metrics;
- project detail pages;
- controlled project editing;
- special update flow for "Следующий шаг";
- project change history;
- user activity history;
- project file attachments;
- CSV export;
- future GigaChat AI analyst through server-side routes only.

## Planned Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Vercel
- GitHub pull request workflow
- GigaChat later through server-side API routes

## Repository Status

Current phase: Next.js app shell.

The repository contains a minimal Next.js, TypeScript, and Tailwind CSS shell. Supabase, Vercel, and GigaChat are not connected yet.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Key Documents

- `PRODUCT_SPEC.md`: product scope and user-facing behavior.
- `DATA_MODEL.md`: proposed database tables and relationships.
- `ROADMAP.md`: phased development plan.
- `CODEX_WORKFLOW.md`: branch, PR, secrets, and external-service workflow.
- `AGENTS.md`: instructions for Codex and future coding agents.
- `.env.example`: placeholder environment variable names only.
- `src/app/dashboard/page.tsx`: initial Russian dashboard shell.
- `docs/VERCEL_SETUP.md`: manual Vercel setup guide.
- `docs/SUPABASE_SETUP.md`: manual Supabase setup guide.
- `docs/CSV_IMPORT.md`: local CSV import workflow for project data.

## Supabase Environment

The app uses current Supabase key naming:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only `NEXT_PUBLIC_*` values may be exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY` is used only by server-side admin routes and must never be committed, sent in chat, or prefixed with `NEXT_PUBLIC_`.

## Supabase Auth

Access is private. The app does not expose public registration.

Protected routes are guarded with Supabase Auth cookies in middleware before protected page content is rendered. Current protected routes are `/dashboard`, `/projects`, and `/ai-analyst`. Public routes are `/` and `/login`.

Admins can create users from `/admin/users`. The server route uses `SUPABASE_SERVICE_ROLE_KEY` to create the Supabase Auth user, creates or updates the matching `public.profiles` row, and returns the generated temporary password once. The password is not stored in the database.

Manual setup for admin user creation:

1. Open Supabase Dashboard.
2. Go to Project Settings -> API.
3. Copy the service role key. Do not paste it into chat or commit it.
4. Add it locally to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

5. Add the same variable to Vercel Environment Variables for the project:
   - name: `SUPABASE_SERVICE_ROLE_KEY`;
   - value: the Supabase service role key;
   - environments: Preview and Production as needed.
6. Redeploy Vercel after adding the variable.
7. Do not use a `NEXT_PUBLIC_` prefix for this value.

To create a test user manually instead:

1. Open Supabase Dashboard.
2. Go to Authentication -> Users.
3. Click Add user.
4. Enter the user's email and password.
5. Use that email and password on `/login`.

## Supabase Database

Database schema changes live in `supabase/migrations`.

The initial schema migration creates:

- app profiles and roles;
- project status, flagship status, cluster, people, and industry unit reference tables;
- project registry, project change history, project file metadata, audit log, and future AI query log tables;
- initial reference values for statuses, flagship statuses, and clusters;
- RLS policies that block anonymous table access and keep writes role-based.

Recommended MVP way to apply the first migration:

1. Open Supabase Dashboard.
2. Open the project.
3. Go to SQL Editor.
4. Open `supabase/migrations/20260706143000_initial_project_registry_schema.sql` locally.
5. Paste the full SQL into a new SQL query.
6. Click Run.
7. After it succeeds, create the first admin profile for your existing Auth user:

```sql
insert into public.profiles (id, email, display_name, role)
select id, email, email, 'admin'
from auth.users
where email = 'your-email@example.com'
on conflict (id) do update
set
  email = excluded.email,
  role = 'admin',
  updated_at = now();
```

Replace `your-email@example.com` with the email you used to log in. Do not paste passwords or secret keys into SQL or chat.

## Project Registry

The first project registry UI is read-only:

- `/dashboard` loads aggregate counters and status/cluster distributions from Supabase.
- `/projects` loads project cards and supports local search/filtering over the authenticated read-only result set.
- `/projects/[id]` shows a read-only project detail page.

The UI respects Supabase Auth, middleware protection, and RLS. Editing, imports, file uploads, and GigaChat are intentionally out of scope for this phase.

## Project Passport Storage

Project passport files use the private Supabase Storage bucket `project-files`.

Storage path convention:

```text
projects/{project_id}/passport/{timestamp}-{safe_filename}
```

Allowed passport file types:

- PDF
- DOCX
- PPTX
- XLSX

Maximum file size: 20 MB.

Apply `supabase/migrations/20260707170000_add_project_file_passport_storage.sql` in Supabase SQL Editor before testing passport upload/download. The migration:

- adds passport/versioning metadata fields to `project_files`;
- creates or updates the private `project-files` bucket;
- allows authenticated users to read files from that bucket;
- allows only `admin` and `editor` profiles to upload/update files in that bucket.

Passport metadata is stored in `project_files` with `file_type = 'passport'`. Only the latest passport should have `is_current = true`.

## CSV Import

Project import is a local server-side workflow, not a browser upload.

Template:

```bash
docs/project-import-template.csv
```

Dry-run:

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --validate-csv-only
```

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --dry-run
```

Real import:

```bash
npm run import:projects -- --file /private/tmp/aij-project-import/projects.csv --import
```

See `docs/CSV_IMPORT.md` before running a real import. Real CSV files and `.env.local` must stay local and must not be committed.

Before the real import, apply `supabase/migrations/20260706201000_add_project_source_payload.sql` in Supabase SQL Editor so original CSV rows can be preserved in `projects.source_payload`.

## Workflow

- `main` stays stable.
- One task equals one branch and one pull request.
- No direct pushes to `main`.
- No real secrets in git.
- Schema changes only through migrations.
- Auth, RLS, and security-sensitive changes require explicit approval.
- External service setup requires manual user confirmation before dependent development continues.

## Manual Setup

No manual external setup is required for the current app-shell phase.

Future phases will require setup for Supabase, Vercel, and later GigaChat. Those steps should be documented and confirmed before implementation continues.
