# Cursor Prompt 02 — M1 Identity and Tenant Foundation

Use only after M0 is reviewed, local app and CI run, and development Supabase is configured. Create GitHub issue branches per task; do not implement all items in a single PR.

Read `docs/04-security-baseline.md`, `docs/02-module-roadmap.md`, `docs/06-definition-of-done.md`, and the accepted ADR before work. Implement the selected issue only.

Design the first tenant schema with organizations, campuses, profiles, organization memberships, membership status, role/permission model, and audit events. Use timestamped SQL migrations and named constraints. Make tenant ownership and any campus scope explicit. Do not store school authorization roles in user-editable metadata. Do not accept a client-supplied organization ID without verifying active membership.

For every exposed tenant-owned table, enable RLS, review and restrict SQL grants, write policies per operation, and add database tests for anonymous access, same-tenant access, cross-tenant denial, cross-tenant mutation attempts, suspended membership, and attempts to reassign tenant/campus ownership. Include indexes for membership/policy lookup paths.

For onboarding, ensure organization creation and first-owner membership are atomic: either all intended records are created or none are. Make retries safe. Implement SSR cookie-based Auth with sign-in, sign-out, callback/confirmation and password-reset paths as separate issues. Keep secrets server-only. Add tests for expired sessions and unauthorized API paths. Do not implement students/fees/attendance yet.

Before coding, state the selected issue ID, its scope/non-goals, migration plan, authorization design, and test plan. After coding run all available tests and explain the outcome. Do not claim tenant isolation until automated deny tests pass.
