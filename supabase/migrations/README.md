# SQL migrations

All database schema, grant, RLS, index, function and policy changes must be committed as ordered Supabase CLI migration files. Do not use dashboard-only schema changes as the source of truth.

## Naming

```text
YYYYMMDDHHMMSS_short_snake_description.sql
```

Examples:

- `20261020180000_foundation_placeholder.sql` (M0 tooling proof only)
- `20261101120000_create_organizations.sql` (M1 — not yet)

Create files with:

```bash
supabase migration new short_snake_description
```

## Apply from a clean database

```bash
# repository root, Docker + Supabase CLI required
supabase db reset
```

That command drops local data, applies every migration in order, then runs `supabase/seed.sql`.

## Scope by milestone

| Milestone | Expected migration content |
|---|---|
| M0 (`ILM-SETUP-003`) | CLI config + empty/placeholder migrate path only |
| M1+ | Tenant tables, grants, RLS, and matching `supabase/tests/` |

Do not invent tenant business tables in M0. When a table is introduced, ship constraints, least-privilege grants, RLS, and allow/deny tests in the same vertical slice.
