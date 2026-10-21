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
| `apps/web/src/app/` | Routes (marketing, auth, `/app`, `/platform`) |
| `apps/web/src/features/` | Domain modules (auth, platform, institution, academic, …) |
| `apps/web/src/components/` | Shared UI shells |
| `apps/web/src/lib/` | Env, brand, Supabase clients, health |
| `supabase/migrations/` | Schema source of truth |
| `supabase/tests/` | SQL / RLS tests |
| `docs/` | Product, architecture, security, status |

## Tenancy direction

**School onboarding (Phase 2+):** `schools`, `school_campuses`, `school_memberships`, `school_applications`, `school_invitations`, plus shared `profiles` / `platform_operators` / `audit_events`.

**Legacy workspace (temporary):** `organizations`, `campuses`, `organization_memberships`, and related academic tables still power `/app` until a dedicated cutover. New registration → login work must use the school tables and must not depend on organization tables.

See `docs/database-schema.md` for the dual-model note and clean-init steps.

## Authorization pattern

1. Authenticate via Supabase Auth session (`getUser()` on the server).
2. Resolve membership / operator status from trusted DB rows.
3. Authorize the specific action.
4. Enforce again with RLS on exposed tables.
5. Never trust client-supplied school/organization IDs or role flags alone.

Privileged `SUPABASE_SECRET_KEY` / service role: server-only, never `NEXT_PUBLIC_*`.

## Public vs authenticated surfaces

| Surface | Purpose | Auth |
| --- | --- | --- |
| Marketing routes (`/`, `/features`, …) | Static product site | None |
| `/auth/*` | Sign-in, sign-up, recovery, invites | Session lifecycle |
| `/platform/*` | Platform operators | `platform_operators` |
| `/app/*` | Institution workspace (legacy org path) | Membership |
| Future `/school/*` | School portal (Phase 8) | `school_memberships` |

## Feature module conventions

Each feature may include `actions`, `queries`, `validate`, `permissions`, UI panels, and colocated `*.test.ts`. Server-only modules use `server-only` where appropriate. Forms validate on the client for UX and again on the server before writes.

## Localization readiness

English is the default locale. Marketing copy and UI strings should live in structured content modules (keys / exports) so Urdu/Arabic and RTL can be added without rewriting routes. Database-backed editable pages come in Phase 12.

## What not to do yet

- Do not extract microservices without a measured need.
- Do not create unused academic tables ahead of their module phase.
- Do not claim live metrics, customer logos, or delivered form submissions when no backend exists.
