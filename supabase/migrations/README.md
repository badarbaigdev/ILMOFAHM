# SQL migrations

All database schema, grant, RLS, index, function and policy changes must be committed as ordered Supabase CLI migration files. Do not use dashboard-only schema changes as the source of truth.

## Naming

```text
YYYYMMDDHHMMSS_short_snake_description.sql
```

Create files with:

```bash
supabase migration new short_snake_description
```

## Apply from a clean database

```bash
# repository root, Docker + Supabase CLI required
supabase db reset
# or
./scripts/supabase-local.sh reset
```

That command drops local data, applies every migration in order, then runs `supabase/seed.sql`.

## Applied foundation migrations

| File | Issue | Contents |
|---|---|---|
| `20261020180000_foundation_placeholder.sql` | ILM-SETUP-003 | Migrate-from-zero proof |
| `20261020210000_tenant_foundation_schema.sql` | ILM-PLAT-001 | `organizations`, `campuses`, `profiles`, `organization_memberships` |
| `20261020213000_tenant_foundation_rls.sql` | ILM-PLAT-002 | Helpers, grants, RLS policies, block `organization_id` reassignment |
| `20261020214500_organization_first_owner_provisioning.sql` | ILM-PLAT-005 | Idempotent `create_organization_with_owner` RPC + provisioning keys |
| `20261020220000_membership_invitations.sql` | ILM-PLAT-006 | Invitations, membership status RPCs, minimal `audit_events` |

## Scope by milestone

| Milestone | Expected migration content |
|---|---|
| M0 | CLI config + placeholder migrate path |
| M1 / ILM-PLAT-001 | Tenant tables, FKs, checks, indexes; RLS enabled deny-by-default |
| M1 / ILM-PLAT-002 | Least-privilege grants + RLS policies (this file) |
| M1 / ILM-PLAT-003 | Automated SQL allow/deny tests (`supabase/tests/database/`) |
| M1 / ILM-PLAT-005 | Atomic first-owner org provisioning via `create_organization_with_owner` RPC |

Never rewrite a migration that has already been applied on a shared environment; add a new forward migration instead.
