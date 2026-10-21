# ILMOFAHM — Database Schema

**Status:** Phase 0 baseline + Phase 2 target  
**Last updated:** 2026-10-21  
**Source of truth:** `supabase/migrations/*.sql`

## Clean-database strategy

1. **Migrations are authoritative.** Initialize any environment with `supabase db reset` (local) or ordered migration apply (hosted). Never treat dashboard-only edits as durable schema.
2. **Local development is disposable.** `./scripts/supabase-local.sh reset` (or `supabase db reset`) destroys local data and re-applies migrations + `seed.sql`. Safe for local Docker only.
3. **Do not reset production or shared remote DBs** without explicit confirmation that the target is a disposable development project. Willingness to abandon *old organization data* is not permission to wipe an unrelated production project.
4. **Fresh schema path (Phase 2):** Introduce school-based tables through new versioned migrations. Prefer a clean development Supabase project when the existing org-based history would confuse the new model. Document which migrations apply to which environment.
5. **Fixtures only.** `seed.sql` and tests use synthetic data — never real student/guardian records.

### Reproduce a clean local database

```bash
# From repository root
docker version && supabase --version
./scripts/supabase-local.sh start   # or: supabase start
./scripts/supabase-local.sh reset   # or: supabase db reset
supabase status -o env              # copy URL + keys into apps/web/.env.local
```

## Current schema (organization-based)

Applied migrations today define:

| Area | Objects |
| --- | --- |
| Tenant root | `organizations`, `campuses`, `profiles`, `organization_memberships` |
| Invites | membership invitation tables/flows |
| Audit | `audit_events` foundation |
| Institution | profile, locale/calendar, branding, campuses, config audit catalog |
| Academic | academic years/terms, school structure, academy structure |
| Platform | `platform_operators` |

RLS and grants are enabled on tenant-owned tables with allow/deny SQL tests under `supabase/tests/database/`.

This model powered early platform/operator and institution workspace work. It is **not** the long-term school-onboarding vocabulary.

## Target schema (school-based onboarding — Phase 2+)

Implement only what onboarding needs first. Expand when modules start.

| Table | Purpose |
| --- | --- |
| `schools` | School tenant root |
| `campuses` | Locations belonging to a school |
| `profiles` | App profile linked to Auth user (no passwords) |
| `school_memberships` | User ↔ school role and status |
| `school_applications` | Public registration requests |
| `school_invitations` | Owner/staff invites (token hash only) |
| `platform_operators` | Platform admin authorization |
| `audit_events` | Security/admin audit trail |

Later modules: `subscription_plans`, `school_subscriptions`, payment ledger, academic years/terms/grades/classes, students/guardians, attendance, exams, fees, languages/translations, editable site pages.

### Design rules

- UUID primary keys; FKs and uniqueness constraints explicit.
- Enable RLS on tenant-owned tables; least-privilege grants.
- Public applicants cannot set approval, reviewer, or provisioning fields.
- Invitation secrets stored hashed; never logged in plaintext.
- Ordinary school users cannot escalate to platform operator.

## Migration inventory (as of Phase 0)

See filenames under `supabase/migrations/`. Placeholder foundation through platform operators (`20261021200000_platform_operators.sql`). Phase 2 will add school-onboarding migrations and document whether org tables are superseded, frozen, or removed in a dedicated development reset.
