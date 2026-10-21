# ILMOFAHM — Database Schema

**Status:** Phase 2 school onboarding foundation added  
**Last updated:** 2026-10-21  
**Source of truth:** `supabase/migrations/*.sql`

## Clean-database strategy

1. **Migrations are authoritative.** Initialize any environment with `supabase db reset` (local) or ordered migration apply (hosted). Never treat dashboard-only edits as durable schema.
2. **Local development is disposable.** `./scripts/supabase-local.sh reset` (or `supabase db reset`) destroys local data and re-applies migrations + `seed.sql`. Safe for local Docker only.
3. **Do not reset production or shared remote DBs** without explicit confirmation that the target is a disposable development project.
4. **School onboarding path (Phase 2+)** uses the school-based tables below. It does **not** require `organizations` / `organization_memberships` for new registration → login work.
5. **Fixtures only.** `seed.sql` and tests use synthetic data — never real student/guardian records.

### Reproduce a clean local database

```bash
# From repository root
docker version && supabase --version
./scripts/supabase-local.sh start   # or: supabase start
./scripts/supabase-local.sh reset   # or: supabase db reset
supabase status -o env              # copy URL + keys into apps/web/.env.local
supabase test db                    # RLS / constraint allow-deny suite
```

## Dual-model note (intentional, temporary)

| Model | Tables | Used by |
| --- | --- | --- |
| **School (target)** | `schools`, `school_campuses`, `school_memberships`, `school_applications`, `school_invitations` | Phases 4–8 onboarding |
| **Organization (legacy)** | `organizations`, `campuses`, `organization_memberships`, … | Existing `/app` workspace until cutover |
| **Shared** | `profiles`, `platform_operators`, `audit_events` | Both |

`public.campuses` remains organization-scoped. School locations are `school_campuses` until a dedicated cutover renames/replaces the legacy campus table. Do not mix FKs across models.

## School onboarding tables (Phase 2)

| Table | Purpose |
| --- | --- |
| `schools` | School tenant root (`provisioning` → `pending_setup` → `active` / `suspended` / `closed`) |
| `school_campuses` | Locations belonging to a school; at most one `is_default` per school |
| `profiles` | Auth-linked profile (no passwords; not an authorization source) |
| `school_memberships` | User ↔ school role (`owner`, `admin`, `teacher`, `accountant`, `staff`) + status |
| `school_applications` | Public registration requests; privileged review/provision fields operator-only |
| `school_invitations` | Invites with **token_hash only** (never plaintext secrets) |
| `platform_operators` | Platform admin authorization (no self-service writes) |
| `audit_events` | Append-only audit; optional `school_id` for school-scoped events |

### Security highlights

- RLS + least-privilege grants on all school tables; `FORCE ROW LEVEL SECURITY`.
- Anon may **INSERT** pending `school_applications` only; no SELECT.
- Trigger strips privileged application columns for non-operators on INSERT.
- Unique open-application guard on `(applicant_email, lower(school_name))`.
- `provisioned_school_id` unique → at most one school per application when provisioning lands.
- `school_id` reassignment blocked on campuses, memberships, invitations.
- Helpers: `is_active_school_member(school_id)`, `is_school_manager(school_id)`.

## Legacy organization schema

Still present from earlier milestones (profile, branding, academic structure, org invites, org provisioning RPCs). Frozen for current `/app` behavior. Not required for the new school registration journey.

## Migration inventory (Phase 2 additions)

| File | Contents |
| --- | --- |
| `20261021300000_school_onboarding_schema.sql` | School tables + `audit_events.school_id` |
| `20261021301000_school_onboarding_rls.sql` | Helpers, grants, RLS, application privilege protection |

Tests: `supabase/tests/database/school_onboarding_foundation.test.sql`
