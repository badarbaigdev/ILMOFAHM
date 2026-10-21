# ILMOFAHM web application

Next.js App Router application for ILMOFAHM.

## Requirements

- Node.js 24 LTS (Node 20+ works for local bootstrap; CI targets Node 24)
- npm

## Commands

```bash
npm install
npm run dev
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run test
npm run build
npm start
npm run check
```

| Script                 | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Local development server (`http://localhost:3000`)                      |
| `npm run lint`         | ESLint (Next core-web-vitals + TypeScript; Prettier conflicts disabled) |
| `npm run format`       | Write Prettier formatting                                               |
| `npm run format:check` | Fail if Prettier formatting drifts                                      |
| `npm run typecheck`    | Strict TypeScript check (`tsc --noEmit`)                                |
| `npm run test`         | Unit tests (Node.js test runner; accepts CI `--run`)                    |
| `npm run build`        | Production build                                                        |
| `npm run check`        | lint + format:check + typecheck + test + build                          |

Vercel **Root Directory** for this app: `apps/web`. Preview/production env scopes, Auth redirect URL patterns, and smoke checks: [`../../docs/09-vercel-preview-runbook.md`](../../docs/09-vercel-preview-runbook.md).

## Environment variables

1. Copy `.env.example` to `.env.local` (never commit `.env.local`).
2. With local Supabase running, fill values from `supabase status` at the repo root:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key from supabase status>
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# SUPABASE_SECRET_KEY=<Secret key from supabase status>   # server-only; optional until admin paths need it
```

Typed accessors live in `src/lib/env.ts`. Supabase helpers:

| Helper                        | Module                        | Key used              |
| ----------------------------- | ----------------------------- | --------------------- |
| `createBrowserSupabaseClient` | `src/lib/supabase/browser.ts` | publishable           |
| `createServerSupabaseClient`  | `src/lib/supabase/server.ts`  | publishable + cookies |
| `createServiceSupabaseClient` | `src/lib/supabase/admin.ts`   | secret (server-only)  |

`@supabase/ssr@0.12.7` is pinned with `@supabase/supabase-js@2.118.0` (peer requires `^2.114.0`). Upgrade both together.

## Unit tests

Tests live next to source as `*.test.ts`. The `test` script compiles them with the workspace TypeScript package and runs them through Node's built-in test runner so quality gates work offline. Prefer migrating to Vitest when the npm registry is available and dependency versions can be pinned cleanly.

## Continuous integration

GitHub Actions workflow: [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

On every pull request and push to `main`, CI runs from `apps/web/`:

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run test -- --run
npm run build
```

Build uses public placeholder env vars only. CI does **not** apply Supabase migrations or use production secrets. Mirror CI locally with `npm run check` (format write vs check aside).

## App shell and health

- Public shell: `src/components/shell/AppShell.tsx` (skip link, brand header, account links, placeholder module nav, footer).
- Landing: `/` — brand page plus foundation status (no fake school data).
- Health: `GET /api/health` → `{ status, service, timestamp }` only (no secrets, no DB probe).

## Auth SSR (ILM-PLAT-004)

Cookie session via `@supabase/ssr`. Middleware refreshes the session and guards `/app/*`. Protected pages also call `getUser()` (never trust client-only session state).

| Route                   | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `/auth/sign-in`         | Email/password sign-in                                   |
| `/auth/sign-up`         | Account + `profiles` bootstrap (no org yet)              |
| `/auth/forgot-password` | Password reset email (Mailpit locally)                   |
| `/auth/update-password` | Set new password after recovery callback                 |
| `/auth/callback`        | PKCE code exchange; then redirects to a safe `next` path |
| `/app`                  | Signed-in workspace placeholder                          |

Local redirects are already allow-listed in `supabase/config.toml` (`site_url` + `additional_redirect_urls`). Hosted Auth URL config: [`../../docs/09-vercel-preview-runbook.md`](../../docs/09-vercel-preview-runbook.md).

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from `supabase status` before exercising Auth locally. Empty placeholders will break runtime Auth calls.

Profile rows are inserted with the user session client under RLS (`src/features/auth/ensure-profile.ts`). Membership/authorization is **not** on `profiles`.

## Organization onboarding (ILM-PLAT-005)

Signed-in users without an active membership are sent to `/app/onboarding`. Submission calls the Postgres RPC `create_organization_with_owner`, which atomically creates:

1. `organizations` (status `trial`)
2. default `campuses` row
3. `organization_memberships` with `role=owner`, `status=active`
4. an idempotency ledger row so safe retries do not duplicate tenants

Direct `INSERT` into `organizations` remains denied by RLS. The RPC never accepts a client-supplied `organization_id`. After `supabase db reset` (or applying the new migration), exercise the flow with a signed-in user.

Apply locally:

```bash
# repo root
./scripts/supabase-local.sh reset
cd apps/web && npm run dev
```

## Authorization helpers (ILM-PLAT-007)

Server-side gate: `authorize()` / `can()` in `src/features/platform/authorization/`.

1. Resolve the signed-in user from the session (never from the request body).
2. Load an **active** membership for the requested `organizationId` from the database.
3. Check the role → permission matrix (`permissions.ts`).
4. Optionally enforce campus / class / guardian-student scope. Class and guardian links fail closed until those modules supply real checkers.

UI flags (e.g. showing an Invite button) are UX only. Mutations must call `authorize()` (and RLS/RPC still enforce independently).

```ts
import {
  authorize,
  createSupabaseAuthorizationDeps,
} from "@/features/platform/authorization";

await authorize(
  {
    organizationId,
    permission: "membership.invite",
    // scope: { type: "campus", campusId },
  },
  createSupabaseAuthorizationDeps(supabase, { user }),
);
```

## Memberships and invitations (ILM-PLAT-006)

- Managers (owner/admin): `/app/members` — invite by email/role, revoke pending invites, suspend/reactivate/revoke members.
- Invite link: `/auth/accept-invite?token=…` (token shown once in the UI; SHA-256 stored in DB). Email delivery is not wired yet — copy the link locally.
- Accept attaches the signed-in user only when their Auth email matches the invite, and only to that invitation’s organization.

## Audit events (ILM-PLAT-008)

- Table `audit_events`: actor, organization, action, target, outcome, timestamp, sanitized metadata (append-only).
- Writers: `write_audit_event` (internal) and `record_audit_event` (authenticated active members; actor forced to `auth.uid()`).
- Secrets/tokens stripped; emails redacted (`sanitize_audit_metadata` / `sanitizeAuditMetadata`).
- Read: managers only (`audit.read` + RLS). UI: `/app/audit`.
- Emitted for org provisioning, invitations, and membership status changes.

## Brand

See [`../../docs/00-brand-and-product.md`](../../docs/00-brand-and-product.md) for canonical product copy. Runtime brand strings live in `src/lib/brand.ts`.
