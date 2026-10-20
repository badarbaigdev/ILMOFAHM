-- ILM-SETUP-003 foundation placeholder.
--
-- Purpose:
--   Prove that the local Supabase migration pipeline can apply ordered SQL
--   from an empty database. M1 introduces real tenant tables (organizations,
--   campuses, profiles, memberships) in later migrations.
--
-- Rules:
--   - Do not invent production schema here.
--   - Do not create tenant-owned tables without RLS + least-privilege grants
--     and allow/deny tests in the same vertical slice.
--   - Prefer additive migrations; never edit applied migration files.

select 1;
