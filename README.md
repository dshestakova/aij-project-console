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
