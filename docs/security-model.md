# ILMOFAHM — Security Model

**Status:** Active  
**Last updated:** 2026-10-21  
**Related:** `docs/04-security-baseline.md`

## Principles

1. **Frontend guards are UX only.** Every protected query, mutation, export, and storage operation is authorized on the server and, where tables are exposed, by PostgreSQL RLS.
2. **Never trust client-supplied tenant IDs, roles, approval statuses, or operator flags.** Resolve scope from Auth session + trusted membership/operator rows.
3. **Never expose** `SUPABASE_SECRET_KEY` / service-role keys in browser code, `NEXT_PUBLIC_*`, logs, or commits.
4. **Least privilege.** Revoke broad grants; add explicit policies per operation (`SELECT` / `INSERT` / `UPDATE` / `DELETE`).
5. **Audit consequential actions** without logging passwords, raw invite tokens, or unnecessary PII.

## Actors

| Actor | Trusted proof | Capabilities (target) |
| --- | --- | --- |
| Anonymous visitor | None | Public site; INSERT pending `school_applications` only |
| Platform operator | `platform_operators` row (`status = active`) | Review applications; provision schools; manage platform |
| School member | Active `school_memberships` | School-scoped operations by role |
| School owner | Membership role from provisioning/invite path | School setup and admin |

## Surfaces

| Surface | Protection |
| --- | --- |
| Marketing pages | Public; no secrets; forms must not fake delivery |
| Public registration | DB: anon INSERT pending apps only (trigger strips privileged columns); no anon SELECT; server action validation + rate limit |
| Application review | Operators use `review_school_application` / `approve_school_application` only; direct UPDATE grant revoked; non-operators get 42501 |
| School provisioning | `provision_school_from_application` only (idempotent); retries do not duplicate schools |
| School invite accept | `accept_school_invitation` — email must match; membership only for invitation school |
| `/platform/*` | Middleware session + active `platform_operators` check; page/`authorizePlatform` gates; RLS/RPCs. Web `/platform/bootstrap` also requires `PLATFORM_BOOTSTRAP_SECRET`; DB rejects bootstrap once any active operator exists. Unauthorized → `/platform/unauthorized` |
| `/school/*` | Middleware session + `school_memberships` authorization + RLS; setup writes via school RPCs only; `complete_school_setup` activates tenant |
| Legacy `/app/*` | Middleware redirects to `/school` (not a live product surface) |
| Privileged RPCs / service client | Server-only; narrow use (e.g. controlled provisioning) |

## Onboarding-specific threats

| Threat | Mitigation |
| --- | --- |
| Applicant self-approves | Status/reviewer/provisioned_school_id not writable via public API |
| Duplicate schools on double-approve | Unique constraints + transactional idempotent provisioning |
| Invite theft / reuse | Hashed tokens, expiry, single-use status, email binding |
| Cross-school access | Membership + RLS; IDOR tests with two schools |
| Operator privilege via profile metadata | Operators only via `platform_operators`, not profile fields |
| Operator privilege via `/platform/bootstrap` URL | Secret-gated web form + DB one-shot; prefer local script; signup never grants operator |
| SaaS payment/subscription tampering | Operator-only RPCs; payments not visible to school members; audited record/void |
| Staff privilege escalation | School permission matrix + manager-only invite/status/role RPCs; owner not inviteable; self/last-owner protected |

## Secrets and environments

- Separate Supabase projects for development, staging, and production.
- Local keys from `supabase status` only.
- CI builds with public placeholders — no production secrets.
- Confirm environment identity before any destructive database operation.

## Required tests (every tenant module)

- Cross-tenant IDOR denied (UI, API, RPC, export, storage).
- Revoked membership / revoked operator denied.
- Expired/reused invitation denied.
- Public cannot list private applications or set privileged columns.
- Provisioning retries do not create duplicate schools.
