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

- Marketing shell: `src/components/marketing/*` for public routes under `src/app/(marketing)/` (`/`, `/features`, `/pricing`, `/demo`, `/register-school`, `/contact`, `/privacy`, `/terms`). Static content; forms validate only until backends land.
- Authenticated shell: `src/components/shell/AppShell.tsx` for `/app`, `/platform`, and `/auth`.
- Health: `GET /api/health` → `{ status, service, timestamp }` only (no secrets, no DB probe).
- Delivery status: [`../../docs/implementation-status.md`](../../docs/implementation-status.md).

## Auth SSR (ILM-PLAT-004)

Cookie session via `@supabase/ssr`. Middleware refreshes the session and guards `/app/*`. Protected pages also call `getUser()` (never trust client-only session state).

| Route                     | Purpose                                                   |
| ------------------------- | --------------------------------------------------------- |
| `/auth/sign-in`           | Email/password sign-in (shared; Superadmin and org admin) |
| `/auth/sign-up`           | Account + `profiles` bootstrap (no org yet)               |
| `/auth/forgot-password`   | Password reset email (Mailpit locally)                    |
| `/auth/update-password`   | Set new password after recovery callback                  |
| `/auth/callback`          | PKCE code exchange; then redirects to a safe `next` path  |
| `/app`                    | Organization workspace (owner/admin and staff)            |
| `/platform`               | Platform operator (Superadmin) console                    |
| `/platform/organizations` | List/create tenants and assign org admins                 |

Local redirects are already allow-listed in `supabase/config.toml` (`site_url` + `additional_redirect_urls`). Hosted Auth URL config: [`../../docs/09-vercel-preview-runbook.md`](../../docs/09-vercel-preview-runbook.md).

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from `supabase status` before exercising Auth locally. Empty placeholders will break runtime Auth calls.

Profile rows are inserted with the user session client under RLS (`src/features/auth/ensure-profile.ts`). Membership/authorization is **not** on `profiles`.

## Platform operator / Superadmin

Platform operators are **not** organization members. They are rows in `platform_operators` and use the same Auth sign-in.

| URL | Who |
| --- | --- |
| `/auth/sign-in` | Superadmin login (same form as school/org users) |
| `/platform` | Superadmin dashboard |
| `/platform/bootstrap` | First-operator bootstrap (disabled after any active operator) |
| `/platform/unauthorized` | Signed-in users without active operator access |
| `/platform/operators` | List / suspend / revoke operators (audited) |
| `/platform/organizations` | All organizations (legacy path) |
| `/platform/organizations/new` | Create org + assign/create org admin |

After sign-in, active operators are redirected to `/platform`. Non-operators who hit `/platform/*` are sent to `/platform/unauthorized` (middleware + page guards). Public sign-up never grants platform privileges. Suspended/revoked operators fail `is_platform_operator()` and cannot call privileged RPCs.

**First-operator bootstrap** (only while no active operator exists):

1. Sign up / sign in as the intended operator.
2. Open `/platform/bootstrap` and confirm, **or** run:

```bash
# repo root — local Supabase must be running
./scripts/bootstrap-platform-operator.sh your-operator@example.test
```

Both paths call `bootstrap_first_platform_operator()` which is permanently rejected once an active operator exists.

Creating an organization as Superadmin requires `SUPABASE_SECRET_KEY` in `apps/web/.env.local` (service role) so new Auth users can be created when the admin email is new.

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

## Workspace context selector (ILM-PLAT-009)

- Server helper `loadWorkspaceContext()` resolves org/campus from **membership-visible** rows only.
- Preferences: httpOnly cookies (`ilm_organization_id`, `ilm_campus_id`) + optional query hints.
- Invalid / cross-tenant IDs are ignored (fall back) without leaking other tenants.
- Switching runs `switchWorkspaceContextAction` → revalidate `/app` layout. **Cookies are never authorization** — always call `authorize()`.
- UI: `ContextSelector` on `/app`, `/app/settings`, `/app/members`, `/app/audit`.

## Audit events (ILM-PLAT-008)

- Table `audit_events`: actor, organization, action, target, outcome, timestamp, sanitized metadata (append-only).
- Writers: `write_audit_event` (internal) and `record_audit_event` (authenticated active members; actor forced to `auth.uid()`).
- Secrets/tokens stripped; emails redacted (`sanitize_audit_metadata` / `sanitizeAuditMetadata`).
- Read: managers only (`audit.read` + RLS). UI: `/app/audit`.
- Emitted for org provisioning, invitations, membership status changes, and organization profile updates.

## Organization profile (ILM-ORG-001)

- Route: `/app/settings` — view profile; owners/admins update name and institution type (`school` / `academy` / `both`).
- RPC `update_organization_profile` enforces manager membership, validates inputs, and audits before/after.
- Trigger blocks Data API changes to `status`, `slug`, `id`, and `created_at`.
- App helpers `supportsSchool` / `supportsAcademy` gate school-only vs academy-only UI; they are not authorization.

## Campus setup (ILM-ORG-002)

- Same `/app/settings` page lists campuses; owners/admins create/update name, code, contact fields, and active/archived status.
- RPCs `create_organization_campus` / `update_organization_campus` enforce manager membership and audit changes.
- Hard delete is revoked for authenticated clients — archive instead.
- Campus-scoped `authorize()` requires the campus to belong to the org and be `active`.

## Locale and calendar (ILM-ORG-003)

- `/app/settings` — timezone, default language (`en`/`ur`), ISO working days, and holiday placeholders.
- RPC `update_organization_locale_settings` uses curated timezone/locale allowlists and audits changes.
- Table `organization_holidays` with create/delete RPCs (unique per org+date).

## Academic years and terms (ILM-ACA-001)

- Route: `/app/setup` — academic years (planned/active/archived, one current per org) and optional terms.
- RPCs `create_academic_year` / `update_academic_year` / `create_academic_term` (manager-only, audited).
- Term dates must fall within the parent year. Permission: `academic.read` / `academic.manage`.

## School structure (ILM-ACA-002)

- `/app/setup` — grades, sections, subjects when institution type is `school` or `both`.
- RPCs refuse academy-only orgs. Soft archive via `archive_grade` (no hard delete).

## Academy structure (ILM-ACA-003)

- `/app/setup` — courses and cohorts/batches when institution type is `academy` or `both`.
- Does not require school grades/sections. Capacity and date fields optional where configured.

## Setup UI gating (ILM-ACA-004)

- `/app/setup` shows school and/or academy panels from trusted `institution_type` (membership context).
- Workspace home links to Academic setup. Gating is UX only — RPCs and `authorize()` enforce access.

## M2 verification (ILM-ACA-005)

- Exit gate: setup configurable; school fields do not block academy; edits permission-checked and audited.
- Deferred to later milestones: teacher/instructor assignments, student enrolment (M3), timetables.

## Branding and contact (ILM-ORG-004)

- `/app/settings` — org contact (email/phone/website), brand display name, `#RRGGBB` color, https logo URL.
- Campus branding overrides (null = inherit org). Receipt/report templates are intentionally out of scope.
- RPCs `update_organization_branding` / `update_campus_branding_overrides` (manager-only, audited).
- `resolveEffectiveBranding()` merges campus overrides for display.

## Configuration audit (ILM-ORG-005)

- Critical settings changes already emit `audit_events` with actor role, timestamp, and before/after metadata.
- Catalog: `CONFIG_AUDIT_ACTIONS` in `src/features/institution/config-audit/`.
- Settings shows a recent configuration-changes panel (`audit.read`); `/app/audit?category=config` filters the full log.
- Effective time: `metadata.effective_at` when set, otherwise the row `created_at`.

## Brand

See [`../../docs/00-brand-and-product.md`](../../docs/00-brand-and-product.md) for canonical product copy. Runtime brand strings live in `src/lib/brand.ts`.
