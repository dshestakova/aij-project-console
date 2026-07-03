# Codex Workflow

## Branch and Pull Request Rules

- `main` is always stable.
- One meaningful task equals one branch and one pull request.
- Branch names should use the `codex/` prefix, for example `codex/project-documentation`.
- Codex must not push directly to `main`.
- The user reviews and approves pull requests before merge.
- Merge only after approval.

## Pull Request Contents

Every pull request should include:

- Summary.
- Files changed.
- How to test.
- Risks and notes.
- Manual actions required from the user, if any.

## Secrets

- Never commit real secrets.
- Never commit local `.env.local`.
- `.env.example` may contain only placeholder keys with empty values.
- Real secrets belong only in local `.env.local`, Vercel Environment Variables, Supabase settings, or another approved secret store.
- Do not paste secret values into chat unless explicitly requested and safe to do so. Prefer naming where the value should be placed.

## External Services

When the next step requires setup in an external service, Codex must stop and provide clear manual instructions before continuing.

Examples:

- Supabase project creation.
- Supabase Auth settings.
- Supabase Storage bucket setup.
- Vercel project connection.
- Vercel Environment Variables.
- GitHub branch or pull request setup.
- GigaChat credentials.

Instructions should include:

- what to create;
- which settings to choose;
- which keys or values to copy;
- where to place them locally;
- where to place them in Vercel or Supabase;
- what not to send in chat;
- what verification step to run.

Codex should wait for user confirmation before continuing with development that depends on those external settings.

## Database Changes

- All database schema changes must be made through migration files.
- No destructive migrations without explicit approval.
- Auth, RLS, storage policies, and security-sensitive changes require explicit approval.
- Migration pull requests should clearly describe expected data impact.

## Vercel Preview

- Vercel preview should be checked by the user before merge once Vercel is connected.
- PR descriptions should mention any required preview checks.
- Production deployment should happen only from approved stable changes.

## Current First Task

The first safe development task is project documentation only:

- `AGENTS.md`
- `PRODUCT_SPEC.md`
- `ROADMAP.md`
- `DATA_MODEL.md`
- `CODEX_WORKFLOW.md`
- `.env.example`
- `README.md`

No full application initialization, Supabase connection, Vercel connection, or GigaChat integration should be added in this task.

