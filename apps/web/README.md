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

## Unit tests

Tests live next to source as `*.test.ts`. The `test` script compiles them with the workspace TypeScript package and runs them through Node's built-in test runner so quality gates work offline. Prefer migrating to Vitest when the npm registry is available and dependency versions can be pinned cleanly.

## Brand

See [`../../docs/00-brand-and-product.md`](../../docs/00-brand-and-product.md) for canonical product copy. Runtime brand strings live in `src/lib/brand.ts`.
