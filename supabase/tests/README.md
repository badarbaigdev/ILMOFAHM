# Database and RLS tests

Add SQL tests for tenant policies and grants as tenant tables are introduced. Tests must include denied access as well as allowed access. Do not consider tenant isolation implemented until cross-tenant tests pass.

## Layout

```text
supabase/tests/
└── <topic>_rls.test.sql   # added with the matching migration vertical slice
```

Run (once tests exist and local Supabase is up):

```bash
supabase test db
```

## Required cases (per exposed tenant table)

- Unauthenticated access denied
- Same-tenant allow path for the intended role
- Cross-tenant read/write denied
- Suspended/revoked membership denied on the next request
- Insert/update cannot reassign `organization_id` / `campus_id` to another tenant

## Status

| Issue | Coverage |
|---|---|
| ILM-PLAT-002 | Policies and grants shipped in migrations |
| ILM-PLAT-003 | Automated allow/deny tests (next) |

Until ILM-PLAT-003 lands, treat isolation as **implemented in SQL but not yet proven by automated tests**.
