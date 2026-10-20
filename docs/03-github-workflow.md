# GitHub Workflow and Work Tracking

## Repository and branch rules

- Keep the repository private until the team deliberately chooses a public source strategy.
- Protect `main`; require a pull request and passing CI before merging.
- Use one short-lived branch per issue: `feat/ILM-PLAT-002-tenant-rls`, `fix/ILM-ATT-003-correction-audit`, or `chore/ILM-SETUP-006-ci`.
- Small, reviewable pull requests are preferred. Do not combine independent modules in one PR.
- Every PR must link its issue (e.g. `Closes #23`) and include verification steps and any migration/deployment impact.

## Milestones

1. `M0 - Engineering foundation`
2. `M1 - Identity and tenancy`
3. `M2 - Institution setup`
4. `M3 - Students and admissions`
5. `M4 - Attendance`
6. `M5 - Fees and collections`
7. `M6 - Examinations and results`
8. `M7 - Pilot readiness`

Create a GitHub Project board with columns: **Backlog → Ready → In progress → In review → QA / UAT → Done**. A task can be `Done` only when Definition of Done is satisfied; merging alone is not enough if QA/UAT is required.

## Issue ID format and types

Use stable IDs in titles: `[ILM-SETUP-001] Bootstrap the Next.js application`. IDs remain in commit/PR references even if tasks move between milestones. Issue types should distinguish Epic, Task, Bug, Security, and Decision.

Every issue should include purpose, scope/non-goals, dependencies, acceptance criteria, test expectations, and any migration/security impact. Acceptance criteria must be verifiable; avoid “works correctly” without defining observable behavior.

## Labels

Suggested labels created by the issue script:

- Type: `type:epic`, `type:task`, `type:bug`, `type:security`, `type:decision`
- Priority: `priority:P0`, `priority:P1`, `priority:P2`
- Modules: `module:setup`, `module:platform`, `module:organization`, `module:students`, `module:attendance`, `module:fees`, `module:examinations`, `module:launch`

P0 means blocks safe pilot/foundation; P1 means required for the first useful pilot; P2 means useful but can follow the initial pilot. Priority is not a substitute for sequencing.

## Pull-request gates

1. Issue is linked and acceptance criteria are checked off.
2. CI passes: install, lint, formatting check if configured, typecheck, unit tests, build.
3. Database migrations are reviewed and tested from a clean local database.
4. RLS/grant/security tests cover each new tenant-owned table and each mutation path.
5. UX includes loading, empty, error and unauthorized states as relevant; mobile/accessibility checked for interactive screens.
6. No secrets, production exports, private child data or personally identifying fixture records were added.
7. README/runbooks/API/schema docs are updated when behavior changes.
8. Risky changes include a deployment and rollback note.

## CI and Vercel

- PR checks run before merge via `.github/workflows/ci.yml` (ILM-SETUP-006).
- CI installs from `apps/web/package-lock.json` with Node 24 LTS, then runs lint, format check, typecheck, unit tests, and production build.
- CI uses placeholder `NEXT_PUBLIC_*` Supabase values only. It never sets `SUPABASE_SECRET_KEY`, never calls a live database, and never applies migrations.
- Vercel previews must use development/staging Supabase credentials, never production secrets. Operator steps: [`09-vercel-preview-runbook.md`](09-vercel-preview-runbook.md).
- Production deploy is tied to `main` after review and CI pass.
- Database migration deployment is a separate, controlled step; do not automatically run destructive database changes just because a frontend preview deploys.
- Restrict production environment secrets to the production deployment context.

## Creating backlog tickets

Review `docs/backlog.csv` first. Run:

```bash
node scripts/create-github-backlog.mjs --dry-run
```

To create labels, milestones and issues, set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, then run:

```bash
node scripts/create-github-backlog.mjs --create
```

The script skips tickets whose `[ILM-...]` title already exists, so it can be rerun for partially completed imports. Use a fine-grained token limited to repository Issues and Milestones administration; do not store the token in the repo or `.env` file.
