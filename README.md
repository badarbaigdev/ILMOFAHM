# ILMOFAHM

**INSTITUTIONAL TECHNOLOGY**  
*One system. Every institution.*

Centralized school and academy management, designed for complete institutional visibility.

## Project Starter

This repository establishes the engineering workflow for ILMOFAHM, a multi-tenant school and academy management SaaS for an initial launch in Pakistan.

> This package is project governance and architecture scaffolding, not a finished application. Use Cursor to implement one milestone at a time and validate every change before merging.

## Decisions for the first release

- **Web application:** Next.js App Router + TypeScript (current stable release; use Node.js 24 LTS).
- **UI:** Tailwind CSS, shadcn/ui, React Hook Form + Zod; add data-grid/chart libraries only when a real screen needs them.
- **Platform services:** Supabase PostgreSQL, Supabase Auth, private Storage, SQL migrations, and Row Level Security (RLS).
- **Deploy:** GitHub for source/issues/PRs; Vercel for the web application; separate Supabase projects for development, staging, and production.
- **Application structure:** modular monolith. Business use-cases live in feature/domain modules and are called by server-only route handlers or server actions. UI components do not contain business rules.
- **Database:** SQL migrations are the source of truth. Do not rely on schema changes made only in the Supabase dashboard.
- **Backend decision:** do not add NestJS or microservices in M0. Revisit a separate API/worker only when measurable needs justify its operations cost.

## Repository layout

```text
.
├── apps/web/                 # Next.js application created in M0
├── supabase/
│   ├── config.toml           # Supabase CLI configuration added in M0
│   ├── migrations/           # Versioned SQL schema and RLS changes
│   ├── tests/                # SQL/RLS policy tests
│   └── seed.sql              # Local-only synthetic seed data
├── docs/                     # Master SRS, architecture, roadmap, decisions, runbooks
├── .cursor/rules/            # Persistent AI coding constraints
├── .gitignore                # Environment secrets and generated files
├── .github/                 # Issue/PR templates and CI workflows
└── scripts/                  # Repeatable project automation
```

Vercel's **Root Directory** should be set to `apps/web`. Use npm and commit only `apps/web/package-lock.json` for the web app. Keep Supabase migrations and project docs at the repository root.

Local Supabase (Docker + CLI): see [`supabase/README.md`](supabase/README.md). Quick helpers: `./scripts/supabase-local.sh start|reset|stop`.

## Start here

Read `docs/00-brand-and-product.md` first and preserve the exact product name, tagline, and descriptor in user-facing work. The master requirements baseline is `docs/08-comprehensive-srs.md`; consult it when refining module scope or acceptance criteria.

1. Create a **private** GitHub repository named `ilmofahm` (or another chosen name).
2. Add this starter package to the repository and push the default branch.
3. Open the repository folder in Cursor.
4. Read `docs/08-comprehensive-srs.md`, `docs/01-architecture-and-stack.md`, `docs/02-module-roadmap.md`, and `docs/03-github-workflow.md`.
5. Start with `ILM-SETUP-001` using `docs/cursor-prompts/01-project-bootstrap.md`. Then handle each remaining M0 issue with its matching prompt in `docs/cursor-prompts/`; keep one issue per branch/PR.
6. Review the diff. Run the documented checks locally. Merge only when CI passes.
7. Connect the repository to Vercel and configure preview deployment variables for a non-production Supabase project. Follow [`docs/09-vercel-preview-runbook.md`](docs/09-vercel-preview-runbook.md) (Root Directory `apps/web`; Preview ≠ production secrets).
8. Create the GitHub backlog using `node scripts/create-github-backlog.mjs --dry-run`, then run `--create` only after reviewing the preview.

## Non-negotiable safety rules

- Never commit `.env.local`, production data, access tokens, service-role/secret keys, or credentials.
- Never expose the Supabase secret/service-role key in browser code or `NEXT_PUBLIC_*` variables.
- Never use production credentials for Cursor-generated code, local development, or preview deployments.
- Every tenant-owned table must have explicit RLS policies and least-privilege grants before it is reachable through Supabase's Data API.
- Every query and mutation must enforce organization and, where relevant, campus/class/guardian scope on the server. Frontend route hiding is not authorization.
- Financial transactions and published results must be corrected through audited reversals/versioned changes, not silent overwrites.
- Use synthetic test data. Do not copy children's real records into development or test environments.

## Backlog

The 52-task initial backlog is in `docs/backlog.csv`. `scripts/create-github-backlog.mjs` can create repository milestones, labels, and issues through the GitHub API. It defaults to dry-run; creating items requires the explicit `--create` flag and `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` environment variables.
