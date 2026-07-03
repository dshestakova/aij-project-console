# AIJ Project Console Roadmap

## Phase 0. Project Documentation and Workflow

- Add product documentation.
- Add data model draft.
- Add Codex workflow rules.
- Add placeholder environment variable file.
- Do not initialize the application yet.
- Do not connect external services yet.

## Phase 1. Next.js App Shell

- Initialize Next.js with TypeScript.
- Add Tailwind CSS.
- Add basic app layout.
- Add Russian UI foundation.
- Add placeholder dashboard route.
- Keep the app independent from Supabase until setup is confirmed.

## Phase 2. Supabase Project Setup Instructions

- Stop development and provide manual Supabase setup instructions.
- User creates the Supabase project.
- User configures local `.env.local`.
- User configures Vercel Environment Variables later.
- Verify that local environment variables are available without exposing secrets.

## Phase 3. Supabase Auth and Protected Dashboard

- Add Supabase Auth integration.
- Add private login page.
- Disable public self-registration in the intended flow.
- Add protected dashboard.
- Add `profiles` foundation.
- Require explicit approval for auth/security behavior.

## Phase 4. Database Schema and Reference Tables

- Add migration files for core tables.
- Add reference tables:
  - project statuses;
  - flagship statuses;
  - clusters;
  - people;
  - person roles;
  - industry units.
- Add soft archive fields.
- Add project changes and audit log tables.
- Add storage metadata table.
- Require explicit approval for RLS/security changes.

## Phase 5. CSV/XLSX Import from Current Google Sheets

- Add import planning and mapping.
- Preserve external project IDs.
- Handle unknown or empty reference values.
- Add import validation output.
- Avoid live Google Sheets integration in the first release.

## Phase 6. Project Registry UI

- Add dashboard summary.
- Add card-based project registry.
- Add search by project ID, client, project name, and essence.
- Add filters by flagship, CSM, director, cluster, status, and archive state.
- Apply cluster colors to ID, title, badge, and card accent.
- Keep UI mobile-first.

## Phase 7. Project Detail Page

- Add project detail view.
- Show all core project fields.
- Show project change history.
- Show project file list.
- Prepare edit affordances based on role.

## Phase 8. Project Editing and Project Change History

- Implement update flow for "Следующий шаг".
- Append old next step to `progress`.
- Save new next step.
- Write `project_changes` record with user, date/time, field, old value, and new value.
- Keep existing progress intact.
- Later expand to other project fields.

## Phase 9. File Attachments

- Add upload flow.
- Store files in Supabase Storage.
- Store metadata in `project_files`.
- Allow admin and editor to delete files.
- Allow viewer to view and download files.
- Log file activity in `audit_log` where practical.

## Phase 10. Export Projects Table

- Add CSV export for authenticated users.
- Log export activity in `audit_log`.
- Later add filtered export and XLSX export if practical.

## Phase 11. Audit Log

- Expand `audit_log` coverage.
- Track login, export, file upload, file deletion, and admin actions.
- Add admin-facing audit view later if needed.

## Phase 12. GigaChat AI Analyst

- Stop development and provide manual GigaChat setup instructions.
- Add server-side API route only.
- Never expose GigaChat keys to the browser.
- Add query logging.
- Add daily usage limits later.

## Phase 13. PWA and Mobile Polish

- Improve mobile ergonomics.
- Review touch targets, responsive cards, filters, and detail pages.
- Consider PWA support after the web release is stable.

## Phase 14. Production Hardening

- Review auth, permissions, RLS, and storage policies.
- Add error monitoring if needed.
- Add backup/export procedures.
- Add performance checks for large registries.
- Add release checklist.

