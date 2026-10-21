# ILMOFAHM — Implementation Status

**Last updated:** 2026-10-21

Track progress across Cursor sessions. Do not mark unfinished work as complete.

## Current phase

**Phase 3 complete.** Next: **Phase 4 — Public school registration** (wire `/register-school` to `school_applications`).

## Phase checklist

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Repository baseline | **Complete** | Inspected; checks documented |
| 1 Public website (static) | **Complete** | All public routes; forms validate without claiming delivery |
| 2 School-based schema | **Complete** | School onboarding tables + RLS; legacy org tables retained for `/app` |
| 3 Platform admin auth | **Complete** | Controlled bootstrap, revocation, middleware + unauthorized page |
| 4 Public school registration | Not started | Form UI ready; DB persistence pending |
| 5 Application review/approval | Not started | |
| 6 School provisioning | Not started | Org provisioning exists; school flow pending |
| 7 Owner invitation/activation | Partial (org invites) | Adapt for school model later |
| 8 School setup + login | Not started | `/app/setup` is org-based |
| 9 Manual subscriptions | Not started | Pricing config file ready for later DB plans |
| 10 School roles | Not started | |
| 11 Academic modules | Partial (org academic structure) | Defer expansion until onboarding E2E |
| 12 Localization | Prepared | Marketing copy in structured modules |
| 13 Security/testing hardening | Ongoing per module | |
| 14 Production deployment | Not started | |

## Phase 0 findings (summary)

- **App:** Next.js 15.5.28, React 19.1, Tailwind 4, Supabase SSR clients
- **DB:** Local Supabase; org-based schema; clean reset via `supabase db reset` (local only)
- **Reusable:** Auth, AppShell, platform operators, audit helpers, brand tokens, CI

### Baseline checks (Phase 0)

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | Pass (95 → later 100 with marketing validators) |
| `npm run build` | Pass |
| `npm run format:check` | Had pre-existing drift; Prettier applied during Phase 1 |

## Phase 1 — What was implemented

Presentable public marketing site with static content:

| Route | Purpose |
| --- | --- |
| `/` | Home — brand hero, features, benefits, pricing preview, FAQ, CTAs |
| `/features` | Capabilities with available / in progress / planned labels |
| `/pricing` | Example plans from central `pricing.ts` (contact-for-pricing) |
| `/demo` | Demo request form (client validation only) |
| `/register-school` | Registration entry form (client validation only) |
| `/contact` | Contact form (client validation only) |
| `/privacy`, `/terms` | Illustrative legal outlines |

### Files changed (high level)

- **Docs:** `docs/implementation-roadmap.md`, `architecture.md`, `database-schema.md`, `security-model.md`, `implementation-status.md`
- **Marketing feature:** `apps/web/src/features/marketing/*`
- **UI:** `apps/web/src/components/marketing/*`
- **Routes:** `apps/web/src/app/(marketing)/*`
- **Layouts:** root layout fonts; AppShell only on `/app`, `/platform`, `/auth`
- **Shell:** signed-out AppShell links to public pages

### Database migrations

None added or applied in Phase 0/1 (by design).

### Checks run (Phase 1)

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass (after clearing stale `.next` types) |
| `npm run test` | Pass — **100** tests, 0 fail |
| `npm run build` | Pass — all public routes listed |
| Browser | Home, features, register-school verified; form invalid + valid paths honest |

### Known limitations

- Demo / contact / register forms do **not** persist or email — clearly labelled demo-stage
- No invented customer stats or live pricing claims

## Phase 2 — What was implemented

School onboarding foundation in versioned migrations (parallel to legacy org model):

| Object | Notes |
| --- | --- |
| `schools` | Tenant root with lifecycle status |
| `school_campuses` | School locations (legacy `campuses` stays org-scoped until cutover) |
| `school_memberships` | owner/admin/teacher/accountant/staff |
| `school_applications` | Public pending inserts; operator review fields protected |
| `school_invitations` | token_hash only |
| Shared | Reused `profiles`, `platform_operators`; `audit_events.school_id` added |

### Migrations added / applied (local)

- `20261021300000_school_onboarding_schema.sql`
- `20261021301000_school_onboarding_rls.sql`
- Applied via `supabase db reset` on local Docker (not production)

### Checks run (Phase 2)

| Check | Result |
| --- | --- |
| `supabase db reset` | Pass — all migrations including Phase 2 |
| `supabase test db` | Pass — **181** tests (includes 25 new school onboarding cases) |

### Known limitations

- Legacy organization schema still present for existing `/app` code
- School campuses table is `school_campuses` until org cutover
- No provisioning RPC yet (Phase 6); no public registration server action yet (Phase 4)
- Application UI still talks to organization tables for the workspace

## Phase 3 — What was implemented

Hardened platform operator authentication:

| Piece | Detail |
| --- | --- |
| Bootstrap | `bootstrap_first_platform_operator()` + `/platform/bootstrap` — disabled once any active operator exists |
| Script | `scripts/bootstrap-platform-operator.sh` calls the same DB function |
| Revocation | `set_platform_operator_status()` + `/platform/operators` (cannot remove last active) |
| Guards | Middleware requires active operator for `/platform/*` (except bootstrap/unauthorized) |
| Unauthorized | `/platform/unauthorized` for signed-in non-operators / revoked |
| Audit | Bootstrap and status changes write `audit_events` |
| Permissions | Expanded platform permission constants for upcoming application/school work |

### Migrations added / applied (local)

- `20261021310000_platform_operator_bootstrap_and_status.sql`
- Applied via `supabase db reset` (local only)

### Checks run (Phase 3)

| Check | Result |
| --- | --- |
| `supabase db reset` | Pass |
| `supabase test db` | Pass — **195** tests (14 new bootstrap/status cases) |
| `npm run lint` / `typecheck` / `test` / `build` | Pass |

### Known limitations

- Operator invite-by-email UI not built (status manage only for existing rows)
- Platform dashboard still org-centric until Phase 5 school application queue
- Recovery of a fully locked-out operator set requires privileged DB access (by design)

## Next milestone

**Phase 4:** Connect `/register-school` to `school_applications` with server validation, rate-limit/abuse basics, and honest success/error states.
