# Cursor Prompt 06 — ILM-SETUP-006: GitHub Actions CI

Implement only `ILM-SETUP-006 — Add GitHub Actions CI quality workflow`.

## Deliverables

- Review `.github/workflows/ci.yml` and make it run after `apps/web/package.json` and `apps/web/package-lock.json` exist.
- Use a currently supported Node LTS runtime (Node 24 LTS is the selected baseline), pinned major versions of maintained GitHub Actions, least permissions (`contents: read` unless a step proves another permission is needed), and no production credentials.
- On pull requests and pushes to `main`, run `npm ci`, lint, typecheck, unit tests and production build from `apps/web/`.
- Use placeholder values only for public build-time Supabase variables where the build requires them. Never access a live production database during CI.
- Do not auto-apply migrations to production and do not print secrets in logs.
- Keep CI fast and deterministic; cache npm using the committed `package-lock.json`.

Test YAML/expressions if tooling is available and explain what could only be verified by a real GitHub Actions run. Stop after ILM-SETUP-006.
