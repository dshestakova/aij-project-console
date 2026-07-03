# AIJ Project Console Agent Instructions

This repository is for AIJ Project Console, a private web application for managing the AIJ project registry.

## Core Rules

- Do not push directly to `main`.
- Use one branch per task and one pull request per branch.
- Never commit real secrets, credentials, API keys, database URLs, auth tokens, exported private datasets, or local `.env` files.
- Keep real secrets only in local `.env.local`, Vercel Environment Variables, Supabase settings, or other approved secret stores.
- Keep `.env.example` limited to placeholder keys with empty values.
- Do not change auth, RLS, access-control, or security-sensitive behavior without explicit approval.
- Do not create destructive database migrations without explicit approval.
- Make all database schema changes through migration files.
- Stop and provide manual setup instructions when the next step requires user action in an external service.

## Product Boundaries

- The current Telegram bot, Cloudflare Worker, Google Apps Script, and Google Sheets MVP must remain separate and stable.
- Do not migrate Apps Script code directly into this repository.
- This repository should grow into a full web product built around Next.js, TypeScript, Tailwind CSS, Supabase, Vercel, and later server-side GigaChat integration.

## Preferred Implementation Direction

- Russian UI.
- Private login/password access with no public self-registration.
- Roles: `admin`, `editor`, `viewer`.
- Mobile-first, clean light interface with white cards, rounded corners, calm colors, and no visual clutter.
- Project registry should use cards and detail views, not spreadsheet-like UI as the primary experience.
- Store files in object storage, not directly in the database.
- Keep GigaChat keys server-side only.

## Pull Request Expectations

Each pull request should include:

- Summary.
- Files changed.
- How to test.
- Risks and notes.
- Manual actions required from the user, if any.

