# ADR-0002: Host-based multi-tenant domains

- **Status:** Accepted
- **Date:** 2026-10-22

## Context

ILMOFAHM serves three audiences from one Next.js app: public marketing, platform operators, and school staff. Path-only routing (`/`, `/platform`, `/school?school=…`) works for early development but does not match the product domain model schools expect (each institution on its own hostname).

## Decision

Use **one Vercel deployment** with **host-based surface routing**:

| Host | Surface | App routes (internal) |
| --- | --- | --- |
| `yourdomain.com` | Public marketing | `/`, `/features`, `/pricing`, `/register-school`, … |
| `www.yourdomain.com` | Canonical redirect | 308 → `https://yourdomain.com/...` |
| `admin.yourdomain.com` | Platform super-admin | Rewritten to `/platform/...` |
| `{schoolSlug}.yourdomain.com` | That school’s portal | Rewritten to `/school/...`; tenant from **slug**, not client-supplied id alone |

Rules:

1. **Authorization stays server/RLS-based.** Hostname selects the tenant *candidate*; membership and platform operator checks still run. Never trust a client-only tenant id.
2. **`schools.slug`** is the subdomain label (already unique + format-constrained in SQL).
3. **Reserved labels** are never school slugs: `www`, `admin`, `api`, `auth`, `app`, `cdn`, `static`, `mail`, `staging`, `develop`, `platform`, `school`, `schools`, etc.
4. **Local / preview without DNS:** omit `NEXT_PUBLIC_ROOT_DOMAIN` → keep today’s path-based URLs (`/school`, `/platform`). Set `NEXT_PUBLIC_ROOT_DOMAIN=localhost` to exercise `admin.localhost` / `{slug}.localhost`.
5. **Auth callbacks** must allow every live host pattern used (apex, `admin.`, `*.` school hosts) in Supabase redirect allow-lists.
6. **Single app, modular monolith** — no separate admin or school deployments unless a later ADR says otherwise.

## Consequences

Positive: clear product URLs; school isolation visible in the browser origin; marketing stays uncluttered; one codebase/CI.

Trade-offs: wildcard TLS/DNS on Vercel; Auth redirect allow-list maintenance; middleware rewrite complexity; local testing needs hosts or `*.localhost`.

## Revisit when

Custom school domains (`portal.school.edu`), multi-region edge needs, or splitting admin into a separate app become requirements.
