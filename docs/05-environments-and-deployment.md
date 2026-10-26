# Environments and Deployment

## Domain architecture (ADR-0002)

One Next.js deployment; surface selected by **hostname**:

| Host | Purpose |
| --- | --- |
| `yourdomain.com` | Public marketing site |
| `www.yourdomain.com` | 308 redirect → apex |
| `admin.yourdomain.com` | Platform super-admin (`/platform`) |
| `{schoolSlug}.yourdomain.com` | That school’s portal (`/school`; tenant from slug) |

- Set `NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com` (or `localhost` for local host tests).
- Leave unset to keep path-based `/school` and `/platform` (default for early local/dev).
- Vercel: add apex + `www` + `admin` + wildcard `*.yourdomain.com`.
- Supabase Auth: allow redirects for apex, `admin.`, and `*.` school hosts.
- Details: [`decisions/ADR-0002-host-based-tenancy.md`](decisions/ADR-0002-host-based-tenancy.md).

## Environments

### Local development

- Run Next.js from `apps/web/`.
- Run Supabase locally with the Supabase CLI/Docker when available. Operator steps: [`../supabase/README.md`](../supabase/README.md) and `./scripts/supabase-local.sh`.
- Apply schema changes only through ordered files in `supabase/migrations/`.
- Use synthetic seed data and test users (`supabase/seed.sql`).
- Optional host routing: `NEXT_PUBLIC_ROOT_DOMAIN=localhost`, then open `http://admin.localhost:3000` and `http://{slug}.localhost:3000`.

### Staging / preview

- Separate Supabase project from production.
- Vercel preview environment variables point to staging or a non-production branch/project.
- Use synthetic/anonymized data only.
- Validate migrations, auth redirect URLs, email flows, private storage, notifications (mocked or test provider), and acceptance journeys.
- Preview `*.vercel.app` hosts stay in **path mode** unless a stable staging apex + wildcard is configured.

### Production

- Separate Supabase project with production-grade access, backup and alerting settings.
- Only the approved production deployment may receive production secrets.
- Apply reviewed migrations through a controlled release procedure.
- Validate health and smoke tests after release; document rollback/recovery decisions.
- Production must set `NEXT_PUBLIC_ROOT_DOMAIN` to the live apex and wire DNS/TLS for admin + wildcard school hosts.

## Environment variables

Keep real values in local ignored `.env.local` files and the appropriate Vercel environment. `apps/web/.env.example` documents names only (no real values).

Expected names (ILM-SETUP-004):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Server-only; do not use NEXT_PUBLIC_ prefix.
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Optional apex for host routing (ADR-0002). Example: ilmofahm.com
# NEXT_PUBLIC_ROOT_DOMAIN=
```

Local setup: copy `apps/web/.env.example` → `apps/web/.env.local`, then fill from `supabase status`. Typed validation lives in `apps/web/src/lib/env.ts`; browser/SSR/admin clients live under `apps/web/src/lib/supabase/`.

A publishable key is expected to be visible to the browser; data security must come from RLS/grants and server authorization, not key secrecy. `SUPABASE_SECRET_KEY` is privileged and server-only; most user-facing operations should use a session-bound client that preserves the user's identity. Add provider keys only with a concrete integration and document their allowed environments.

## Vercel setup

Full operator runbook (ILM-SETUP-007): [`09-vercel-preview-runbook.md`](09-vercel-preview-runbook.md).

Summary:

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Use preview deployments for pull requests and production deployment from protected `main`.
4. Add development/staging credentials to Preview/Development contexts and production credentials only to Production context — Preview must never use production Supabase.
5. Configure Supabase Auth Site URL and allowed redirect URLs for local, preview/staging, and production (details in the runbook).
6. After deploy, run the preview smoke checks in the runbook (public page, `/api/health`, env isolation; Auth flows once M1 lands).
7. Add the live domain only after security, privacy, backup, and school UAT release gates have passed.

Cursor cannot create Vercel/Supabase/GitHub resources without authorized human access; do not invent project IDs or domains in the repository.

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
