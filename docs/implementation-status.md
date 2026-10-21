# ILMOFAHM — Implementation Status

**Last updated:** 2026-10-21

Track progress across Cursor sessions. Do not mark unfinished work as complete.

## Current phase

**Phase 1 complete.** Next: **Phase 2 — Design and create the fresh school-based database.**

## Phase checklist

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Repository baseline | **Complete** | Inspected; checks documented |
| 1 Public website (static) | **Complete** | All public routes; forms validate without claiming delivery |
| 2 School-based schema | Not started | Org-based migrations exist today |
| 3 Platform admin auth | Partial (pre-existing) | `platform_operators` + `/platform` under org model |
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
- Existing DB remains **organization**-based until Phase 2
- No invented customer stats or live pricing claims

## Next milestone

**Phase 2:** Design and create the fresh school-based onboarding schema (`schools`, `campuses`, `profiles`, `school_memberships`, `school_applications`, `school_invitations`, `platform_operators`, `audit_events`) with RLS, grants, and reproducible clean init — without resetting any confirmed production database.
