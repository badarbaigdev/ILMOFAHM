# SQL migrations

All database schema, grant, RLS, index, function and policy changes must be committed as ordered Supabase CLI migration files. Do not use dashboard-only schema changes as the source of truth. M0 sets up the tooling; M1 introduces the tenant schema.
