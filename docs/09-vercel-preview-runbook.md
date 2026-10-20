# Vercel preview deployment runbook (ILM-SETUP-007)

Operator guide for connecting the ILMOFAHM GitHub repository to Vercel and keeping **preview** deployments on non-production Supabase credentials.

> Cursor (and this repository) cannot create Vercel, Supabase, or GitHub projects, domains, or env values for you. An authorized human must perform dashboard steps. Do not invent project IDs, custom domains, or live URLs in docs or code.

## 1. Import the repository into Vercel

1. Sign in to Vercel with an account that can access the private GitHub repo.
2. **Add New… → Project** and import the ILMOFAHM GitHub repository.
3. Configure the project:
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** `apps/web` (required — the Next.js app is not at the repo root).
   - **Install Command:** `npm ci` (or leave default `npm install`; prefer lockfile installs).
   - **Build Command:** `npm run build` (default for Next.js is fine).
   - **Output Directory:** leave default (Next.js on Vercel).
4. Do **not** add a custom production domain until pilot gates in M7 are met.
5. After the first import, confirm that pull requests create **Preview** deployments and that `main` deploys to **Production** only when you intend that.

No Vercel-specific config file is required in-repo for this baseline. Prefer Vercel project settings over hardcoding domains in source.

## 2. Environment scopes

Use **separate Supabase projects** (or at least strictly separated credentials) for non-production vs production. Never point Preview at production.

| Scope | Where values live | Supabase target | Notes |
|---|---|---|---|
| Local development | `apps/web/.env.local` (gitignored) | Local CLI stack (`supabase start`) or a dedicated **dev** project | See `apps/web/.env.example` and `supabase/README.md` |
| Vercel **Preview** | Vercel → Project → Settings → Environment Variables → **Preview** | **Development or staging** Supabase project only | Every PR preview must use these non-prod values |
| Vercel **Development** (optional) | Vercel “Development” env | Same as local/dev project | Used by `vercel dev` if the team uses it |
| Vercel **Production** | Vercel → **Production** env only | **Production** Supabase project only | Restrict who can edit; never copy these into Preview |

### Required variable names

Same names as `apps/web/.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SECRET_KEY=
```

Rules:

- `NEXT_PUBLIC_*` values are embedded in the browser bundle. They must still be **non-production** on Preview.
- `SUPABASE_SECRET_KEY` is server-only. Set it only in Vercel server env (all scopes that need it). Never prefix it with `NEXT_PUBLIC_`.
- For Preview, set `NEXT_PUBLIC_APP_URL` to a stable staging URL if you have one; if you rely on per-PR `*.vercel.app` hosts, prefer reading the deployment URL at runtime later—do **not** hardcode a single PR URL into the repo. Until Auth is implemented (M1), a placeholder non-prod app URL is acceptable for build/smoke.
- GitHub Actions CI uses **placeholders only** and must not receive real Supabase secrets (see `.github/workflows/ci.yml`).

### Preview vs production checklist (credentials)

Before merging a change that touches env or Auth:

- [ ] Preview env in Vercel points at staging/dev Supabase URL (not the production project ref).
- [ ] Production env is not reusable as Preview by “Apply to all environments”.
- [ ] No production service-role/secret key was pasted into Preview or committed to git.

## 3. Supabase Auth Site URL and redirect allow-list

Configure these in each **Supabase project** (local `config.toml` already covers local defaults; hosted projects use the Supabase Dashboard → Authentication → URL configuration).

**ILM-PLAT-004** Auth callback path is `/auth/callback` (optional `?next=` for a safe internal destination). Password reset lands on `/auth/update-password` after the callback. Allow these redirect patterns per environment:

| Environment | Site URL (primary) | Redirect URLs to allow (examples) |
|---|---|---|
| Local | `http://127.0.0.1:3000` or `http://localhost:3000` | `http://127.0.0.1:3000/**`, `http://localhost:3000/**`, `http://127.0.0.1:3000/auth/callback`, `http://localhost:3000/auth/callback` |
| Vercel Preview | Prefer a **stable staging hostname** if you have one; otherwise the current preview deployment origin | Staging: `https://<your-staging-host>/**`. Per-PR: add `https://<preview-host>/**` or a documented wildcard pattern supported by your Supabase plan/docs |
| Staging (hosted app) | `https://<staging-host>` | `https://<staging-host>/**`, `https://<staging-host>/auth/callback` |
| Production | `https://<production-host>` | Only production hosts: `https://<production-host>/**`, `https://<production-host>/auth/callback` |

Notes:

- Replace `<…>` with real hosts when the team creates them. Do not invent domains in PRs.
- Supabase redirect allow-lists are security-sensitive: never add production callback URLs to a **dev/staging** project, and never add open `*` redirects.
- Local Auth email is captured by Mailpit (`[local_smtp]` in `supabase/config.toml`); hosted projects need real SMTP or Supabase email settings appropriate to that environment.

## 4. Preview smoke checks

After a Preview deployment finishes, an engineer verifies:

1. **Build** — Vercel build succeeded; GitHub CI on the same commit is green.
2. **Public page** — `/` loads the ILMOFAHM brand landing (no fake student/institution records).
3. **Health** — `GET /api/health` returns JSON shaped like `{ "status": "ok", "service": "ilmofahm-web", "timestamp": "..." }` with **no** keys, DB URLs, or stack traces.
4. **Env isolation** — In browser network/app config, the Supabase URL host matches the **non-production** project (compare project ref/host to the staging/dev dashboard—not production).
5. **Auth callbacks** — Sign-in, sign-out, `/auth/callback`, and password-reset (`/auth/forgot-password` → email → `/auth/update-password`) against the Preview/staging project only.
6. **Data** — Only synthetic/staging data; no production exports.

If any check fails, fix before merge. Do not “hot-fix” by pointing Preview at production.

## 5. Migrations and Preview

- Vercel deploy does **not** apply `supabase/migrations/`.
- Schema changes are released through the controlled migration process in `docs/05-environments-and-deployment.md` and `supabase/README.md`.
- Preview apps assume the target non-prod database already has the required migrations applied.

## 6. What this runbook does not do

- Create the Vercel project, domains, or DNS.
- Create Supabase staging/production projects.
- Store or print real API keys.
- Implement Auth UI (M1) or business modules.
- Claim a deployment succeeded unless a human observed Vercel/GitHub evidence.

## Related docs

- Environments overview: [`05-environments-and-deployment.md`](05-environments-and-deployment.md)
- GitHub CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) and [`03-github-workflow.md`](03-github-workflow.md)
- Local Supabase: [`../supabase/README.md`](../supabase/README.md)
- Web app env helpers: [`../apps/web/README.md`](../apps/web/README.md)
