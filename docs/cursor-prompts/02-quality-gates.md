# Cursor Prompt 02 — ILM-SETUP-002: Code Quality and Test Commands

Read the architecture, definition-of-done and Cursor rules. Implement only `ILM-SETUP-002 — Set up lint, formatting, strict typecheck and unit test commands`.

## Deliverables

- Establish strict, repeatable ESLint and formatting checks appropriate for the current stable Next.js release. Next.js 16 removed `next lint`; use the supported ESLint CLI/tooling, not a deprecated script.
- Add a reliable `typecheck` script that runs TypeScript without emitting output.
- Add a minimal unit test framework (prefer Vitest unless a justified compatibility issue arises) and one meaningful smoke/unit test. Do not create empty tests merely to pass CI.
- Make scripts work from `apps/web/`: lint, format/check if selected, typecheck, test, build.
- Document exact commands in `apps/web/README.md` or the root development docs.
- Do not add business modules, Supabase schema, CI workflow, or Vercel configuration in this issue.

Keep dependencies stable and mutually compatible. Run all new scripts and fix failures without globally disabling rules or loosening TypeScript. Report commands and actual results. Stop after this issue.
