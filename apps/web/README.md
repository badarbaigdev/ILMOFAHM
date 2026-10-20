# ILMOFAHM web application

Next.js App Router application for ILMOFAHM.

## Requirements

- Node.js 24 LTS (Node 20+ works for local bootstrap; CI targets Node 24)
- npm

## Commands

```bash
npm install
npm run dev
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run test
npm run build
npm start
npm run check
```

| Script                 | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Local development server (`http://localhost:3000`)                      |
| `npm run lint`         | ESLint (Next core-web-vitals + TypeScript; Prettier conflicts disabled) |
| `npm run format`       | Write Prettier formatting                                               |
| `npm run format:check` | Fail if Prettier formatting drifts                                      |
| `npm run typecheck`    | Strict TypeScript check (`tsc --noEmit`)                                |
| `npm run test`         | Unit tests (Node.js test runner; accepts CI `--run`)                    |
| `npm run build`        | Production build                                                        |
| `npm run check`        | lint + format:check + typecheck + test + build                          |

Vercel **Root Directory** for this app: `apps/web`.

## Environment variables

1. Copy `.env.example` to `.env.local` (never commit `.env.local`).
2. With local Supabase running, fill values from `supabase status` at the repo root:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key from supabase status>
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# SUPABASE_SECRET_KEY=<Secret key from supabase status>   # server-only; optional until admin paths need it
```

Typed accessors live in `src/lib/env.ts`. Supabase helpers:

| Helper                        | Module                        | Key used              |
| ----------------------------- | ----------------------------- | --------------------- |
| `createBrowserSupabaseClient` | `src/lib/supabase/browser.ts` | publishable           |
| `createServerSupabaseClient`  | `src/lib/supabase/server.ts`  | publishable + cookies |
| `createServiceSupabaseClient` | `src/lib/supabase/admin.ts`   | secret (server-only)  |

`@supabase/ssr@0.12.7` is pinned with `@supabase/supabase-js@2.118.0` (peer requires `^2.114.0`). Upgrade both together.

## Unit tests

Tests live next to source as `*.test.ts`. The `test` script compiles them with the workspace TypeScript package and runs them through Node's built-in test runner so quality gates work offline. Prefer migrating to Vitest when the npm registry is available and dependency versions can be pinned cleanly.

## App shell and health

- Public shell: `src/components/shell/AppShell.tsx` (skip link, brand header, placeholder module nav, footer).
- Landing: `/` — brand page plus foundation status (no fake school data).
- Health: `GET /api/health` → `{ status, service, timestamp }` only (no secrets, no DB probe).

## Brand

See [`../../docs/00-brand-and-product.md`](../../docs/00-brand-and-product.md) for canonical product copy. Runtime brand strings live in `src/lib/brand.ts`.
