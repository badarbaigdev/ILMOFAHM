# Environments and Deployment

## Environments

### Local development

- Run Next.js from `apps/web/`.
- Run Supabase locally with the Supabase CLI/Docker when available. Operator steps: [`../supabase/README.md`](../supabase/README.md) and `./scripts/supabase-local.sh`.
- Apply schema changes only through ordered files in `supabase/migrations/`.
- Use synthetic seed data and test users (`supabase/seed.sql`).

### Staging / preview

- Separate Supabase project from production.
- Vercel preview environment variables point to staging or a non-production branch/project.
- Use synthetic/anonymized data only.
- Validate migrations, auth redirect URLs, email flows, private storage, notifications (mocked or test provider), and acceptance journeys.

### Production

- Separate Supabase project with production-grade access, backup and alerting settings.
- Only the approved production deployment may receive production secrets.
- Apply reviewed migrations through a controlled release procedure.
- Validate health and smoke tests after release; document rollback/recovery decisions.

## Environment variables

Keep real values in local ignored `.env.local` files and the appropriate Vercel environment. `apps/web/.env.example` documents names only (no real values).

Expected names (ILM-SETUP-004):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Server-only; do not use NEXT_PUBLIC_ prefix.
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Local setup: copy `apps/web/.env.example` → `apps/web/.env.local`, then fill from `supabase status`. Typed validation lives in `apps/web/src/lib/env.ts`; browser/SSR/admin clients live under `apps/web/src/lib/supabase/`.

A publishable key is expected to be visible to the browser; data security must come from RLS/grants and server authorization, not key secrecy. `SUPABASE_SECRET_KEY` is privileged and server-only; most user-facing operations should use a session-bound client that preserves the user's identity. Add provider keys only with a concrete integration and document their allowed environments.

## Vercel setup

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Use preview deployments for pull requests and production deployment from protected `main`.
4. Add development/staging credentials to Preview/Development contexts and production credentials only to Production context.
5. Configure Supabase Auth Site URL and allowed redirect URLs for local, staging/preview as appropriate, and production domains.
6. After deploy, test sign-in, sign-out, protected routes, password reset, and RLS-restricted reads against the environment's own test data.
7. Add the live domain only after security, privacy, backup, and school UAT release gates have passed.

## Database migration release

- Write a new timestamped SQL migration in `supabase/migrations/`.
- Test on a local database rebuilt from zero and run RLS tests.
- Review locks, indexes, defaults, constraints, and backwards compatibility.
- Apply to staging and execute smoke tests.
- Back up before high-risk production changes; apply reviewed production migration during a planned release.
- Prefer additive changes and staged backfills over a one-step destructive rename/drop.
- Keep a recovery plan. Rolling back application code does not automatically roll back a database schema.

## Backup reminder

Database backups may not include Storage file objects. Define a separate object-storage backup/retention/recovery procedure and run a restore exercise before pilot. A backup is not proven until the team has restored it and verified business data and files.
