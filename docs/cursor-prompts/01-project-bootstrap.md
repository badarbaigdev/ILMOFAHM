# Cursor Prompt 01 — ILM-SETUP-001: Bootstrap the Next.js Application

Read `docs/00-brand-and-product.md`, `README.md`, `docs/01-architecture-and-stack.md`, `docs/02-module-roadmap.md`, `docs/03-github-workflow.md`, `docs/06-definition-of-done.md`, and `.cursor/rules/ilmofahm-project.mdc` before editing anything.

## Active GitHub issue

`ILM-SETUP-001 — Bootstrap Next.js App Router TypeScript app in apps/web`

## Scope: this issue only

Create the runnable Next.js application baseline. Do not implement Supabase auth/client helpers, the tenant database schema, global CI, organization onboarding, student CRUD, attendance, fees, exams, or other backlog tasks in this issue.

## Requirements

1. Inspect the repository and preserve root-level documentation, `.github/`, `.cursor/`, `scripts/`, and existing Supabase folders.
2. Scaffold a new application in `apps/web/` using the current stable Next.js App Router, TypeScript, Tailwind CSS and ESLint. Use Node.js 24 LTS and npm. Check the current create-next-app CLI help before choosing flags.
3. Because `apps/web/` already contains a starter README, scaffold in a temporary empty directory outside the repository and copy the generated app into `apps/web/`. Do not run create-next-app against the non-empty repository root. Preserve repository-root files. Replace the placeholder `apps/web/README.md` with an application-specific README if needed.
4. Commit one lockfile only: `apps/web/package-lock.json`. Do not add pnpm/yarn/bun lockfiles.
5. Keep the default start page simple, accessible, and brand-accurate: show the label “INSTITUTIONAL TECHNOLOGY”, the wordmark “ILMOFAHM”, the tagline “One system. Every institution.”, and the descriptor “Centralized school and academy management, designed for complete institutional visibility.” Use real text, not an image. Include no fake student/guardian/business records. Do not add polished dashboard mockups that imply implemented features.
6. Ensure at minimum the `dev`, `build` and `lint` scripts are valid. Do not weaken strict TypeScript defaults just to get a green build.
7. Run install and `npm run build`; run lint if defined. Report actual output. If network/installation is unavailable, report that honestly rather than claiming success.
8. Update the root docs only if a new command/location needs documenting; do not rewrite the architecture decisions.

## Constraints

- No real secrets, database credentials, tokens, or personal data.
- No `SUPABASE_SECRET_KEY` usage in client code.
- No business data schema or feature logic in this issue.
- Do not claim GitHub/Vercel/Supabase resources were created or connected.

Before coding, state the issue ID, current repository observations, and a short plan. After coding, report changed files, commands and their actual results, unresolved setup steps, and how to run the app locally. Stop after ILM-SETUP-001.
