# ILMOFAHM — Architecture

**Status:** Active for school-based rebuild  
**Last updated:** 2026-10-21  
**Related:** `docs/01-architecture-and-stack.md` (original stack ADR narrative), `docs/decisions/ADR-0001-stack.md`

## Summary

ILMOFAHM is a **modular monolith**: one Next.js application talking to one shared Supabase project (PostgreSQL + Auth + Storage). Business logic lives in feature modules under `apps/web/src/features/`. Presentational components do not own authorization or database rules.

## Runtime topology

```text
Browser
  └── Next.js (apps/web) — App Router, Server Components, Server Actions
        ├── Supabase Auth (SSR cookies via @supabase/ssr)
        ├── Supabase PostgreSQL (RLS + grants)
        └── Supabase Storage (private buckets; later modules)
```

Deploy: GitHub → Vercel (`apps/web` root). Migrations applied separately through Supabase CLI to the target environment.

## Repository map

| Path | Role |
| --- | --- |
| `apps/web/` | Next.js 15 App Router application |
| `apps/web/src/app/` | Routes (public marketing, auth, `/platform`, `/school`) |
| `apps/web/src/features/` | Domain modules (auth, platform, institution, academic, …) |
| `apps/web/src/components/` | Shared UI shells |
| `apps/web/src/lib/` | Env, brand, Supabase clients, health |
| `supabase/migrations/` | Schema source of truth |
| `supabase/tests/` | SQL / RLS tests |
| `docs/` | Product, architecture, security, status |

## Tenancy direction

**School onboarding (Phase 2+):** `schools`, `school_campuses`, `school_memberships`, `school_applications`, `school_invitations`, plus shared `profiles` / `platform_operators` / `audit_events`.

**Legacy workspace (temporary):** `organizations` and related tables remain in the database for older code under `src/app/app/`, but live product URLs `/app/*` redirect to `/school`. New registration → login work must use school tables only.

See `docs/database-schema.md` for the dual-model note and clean-init steps.

## Authorization pattern

1. Authenticate via Supabase Auth session (`getUser()` on the server).
2. Resolve membership / operator status from trusted DB rows.
3. Authorize the specific action.
4. Enforce again with RLS on exposed tables.
5. Never trust client-supplied school/organization IDs or role flags alone.

Privileged `SUPABASE_SECRET_KEY` / service role: server-only, never `NEXT_PUBLIC_*`.

## Route lanes (product surface)

| Lane | Routes | Auth |
| --- | --- | --- |
| **Public** | `/`, `/features`, `/pricing`, `/demo`, `/register-school`, `/contact`, `/privacy`, `/terms` | None |
| **Auth** | `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/callback`, `/auth/accept-school-invite` | Session lifecycle |
| **Platform admin** | `/platform`, `/platform/requests`, `/platform/schools`, `/platform/plans`, `/platform/subscriptions`, `/platform/operators` | Active `platform_operators` row |
| **School admin** | `/school`, `/school/setup`, `/school/settings`, `/school/members` | Active `school_memberships` + role permission matrix |

**Removed from the live product surface:** `/app/*` (legacy org workspace) and `/platform/organizations*` redirect away. Org invite `/auth/accept-invite` redirects to school invite accept.

**Platform bootstrap:** `/platform/bootstrap` is not a public signup path. It requires server env `PLATFORM_BOOTSTRAP_SECRET` (and the DB still refuses bootstrap once any active operator exists). Prefer `./scripts/bootstrap-platform-operator.sh` for local setup.

## Feature module conventions

Each feature may include `actions`, `queries`, `validate`, `permissions`, UI panels, and colocated `*.test.ts`. Server-only modules use `server-only` where appropriate. Forms validate on the client for UX and again on the server before writes.

## Localization readiness

English is the default locale. Marketing copy and UI strings should live in structured content modules (keys / exports) so Urdu/Arabic and RTL can be added without rewriting routes. Database-backed editable pages come in Phase 12.

## What not to do yet

- Do not extract microservices without a measured need.
- Do not create unused academic tables ahead of their module phase.
- Do not claim live metrics, customer logos, or delivered form submissions when no backend exists.
