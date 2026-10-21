# Database and RLS tests

SQL tests use **pgTAP** via the Supabase CLI. Prefer files under `supabase/tests/database/*.sql`.

## Run

```bash
# repository root — local stack must be up with migrations applied
supabase db reset          # optional clean slate
supabase test db
```

Or:

```bash
./scripts/supabase-local.sh reset
supabase test db
```

## Required cases (tenant tables)

- Unauthenticated access denied
- Same-tenant allow path for the intended role
- Cross-tenant read/write denied
- Suspended/revoked membership denied on the next request
- Insert/update cannot reassign `organization_id` to another tenant

## Status

| Issue | Coverage |
|---|---|
| ILM-PLAT-002 | Policies and grants in migrations |
| ILM-PLAT-003 | `database/tenant_foundation_rls.test.sql` — anon, same-tenant, cross-tenant, suspended, ownership reassignment, profile isolation |
| ILM-ORG-001 | `database/organization_profile.test.sql` — profile RPC allow/deny, lifecycle column protection, cross-tenant denial |
| ILM-ORG-002 | `database/campus_setup.test.sql` — campus create/update allow/deny, contact validation, hard-delete revoked |
| ILM-ORG-003 | `database/organization_locale_calendar.test.sql` — locale/working days/holidays allow/deny and validation |
| ILM-ORG-004 | `database/organization_branding.test.sql` — branding/contact allow/deny, campus overrides, validation |
| ILM-ORG-005 | `database/organization_config_audit.test.sql` — config audit before/after + actor_role |
| ILM-ACA-001 | `database/academic_years_terms.test.sql` — years/terms allow/deny, term range, audit |
| ILM-ACA-002 | `database/school_structure.test.sql` — grades/sections/subjects; academy-only denied |
| ILM-ACA-003 | `database/academy_structure.test.sql` — courses/cohorts; school-only denied |
| Platform operator | `database/platform_operators.test.sql` — Superadmin provision allow/deny; org admin cannot use platform RPCs |

Do not claim tenant isolation for later modules until matching deny tests exist for those tables too.
