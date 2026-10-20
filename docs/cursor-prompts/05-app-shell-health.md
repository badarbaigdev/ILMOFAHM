# Cursor Prompt 05 — ILM-SETUP-005: Accessible App Shell and Health Route

Implement only `ILM-SETUP-005 — Create accessible app shell and health endpoint`.

## Deliverables

- Build a restrained, responsive public ILMOFAHM landing/status page and a small shell foundation that later role dashboards can reuse. This is a foundation, not the production design for all modules.
- Keep navigation labels limited to planned module areas and clearly indicate unimplemented sections as placeholders if shown; do not simulate functional records.
- Add `/api/health` or the equivalent App Router route handler returning a simple, non-sensitive status and timestamp/build-safe metadata.
- The health endpoint must never expose environment variables, database URLs, keys, stack traces or provider status that would reveal internal secrets. Do not make an unbounded DB call from health checks.
- Review semantic HTML, headings, keyboard focus, contrast and mobile layout. Include useful loading/error states if the UI actually performs async work.

Do not implement Auth or school business modules. Run checks and report results. Stop after ILM-SETUP-005.
