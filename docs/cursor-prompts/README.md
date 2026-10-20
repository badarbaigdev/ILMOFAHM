# Cursor prompts — one issue at a time

Run prompts in issue order. Each prompt is intentionally scoped to one GitHub ticket; do not ask Cursor to implement the whole roadmap in one pass. Review diffs and test results before marking an issue complete.

| Prompt | GitHub issue | Scope |
|---|---|---|
| `01-project-bootstrap.md` | `ILM-SETUP-001` | Scaffold Next.js app only |
| `02-quality-gates.md` | `ILM-SETUP-002` | Lint, format, typecheck, unit test |
| `03-supabase-local-workflow.md` | `ILM-SETUP-003` | Supabase CLI and migration workflow |
| `04-env-and-supabase-clients.md` | `ILM-SETUP-004` | Environment validation and SSR clients |
| `05-app-shell-health.md` | `ILM-SETUP-005` | Accessible shell and health route |
| `06-github-ci.md` | `ILM-SETUP-006` | CI workflow |
| `07-vercel-preview-runbook.md` | `ILM-SETUP-007` | Preview deployment runbook |
| `02-tenant-foundation.md` | M1 guidance | Use only after M0; still implement one selected M1 issue at a time |
