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

Do not claim tenant isolation for later modules until matching deny tests exist for those tables too.
