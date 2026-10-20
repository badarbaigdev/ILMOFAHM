# Cursor Prompt 03 — ILM-SETUP-003: Supabase Local and Migrations Workflow

Implement only `ILM-SETUP-003 — Initialize Supabase CLI and local migration workflow` after the Next.js app exists.

## Deliverables

- Add/adjust the Supabase CLI project config at repository root and ensure `supabase/migrations/`, `supabase/tests/`, and `supabase/seed.sql` are version-controlled.
- Document how to install/use the Supabase CLI and how to start/reset local Supabase with Docker where supported.
- Establish the convention for creating ordered, timestamped SQL migrations and applying them from a clean local database.
- Keep M1 tenant tables out of this issue; only minimal CLI configuration needed for local setup is in scope.
- Keep seed data synthetic only; do not include production records or secrets.
- Do not use dashboard-only schema edits as the migration source of truth.
- Do not add application Auth clients or environment validation in this issue; those are ILM-SETUP-004.

Run available config/lint checks and document any Docker/CLI service you could not run. Do not claim local DB tests passed unless they actually ran. Stop after this issue.
