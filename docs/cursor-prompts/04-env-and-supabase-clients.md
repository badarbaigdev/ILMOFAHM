# Cursor Prompt 04 — ILM-SETUP-004: Environment Validation and Supabase Client Helpers

Implement only `ILM-SETUP-004 — Add typed environment validation and safe Supabase client helpers`.

## Deliverables

- Add a documented env example containing variable names but no real values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server-only, optional until required), and `NEXT_PUBLIC_APP_URL` as appropriate.
- Add startup/runtime environment validation with useful development errors that never print secret values.
- Use the current official Next.js SSR integration for Supabase Auth (`@supabase/ssr`) and isolate SDK-specific functionality in small local helpers. The official package is documented as beta at present: pin the selected version in the lockfile and avoid spreading SDK calls throughout the app.
- Keep browser and server clients in separate modules. Server sessions must use cookie-based SSR integration. Never import a privileged client into a Client Component or expose any secret key under a `NEXT_PUBLIC_` name.
- Add tests for missing/invalid configuration where practical without requiring real provider credentials.
- Do not implement sign-in pages, organization schema, RLS policies or business features in this issue.

Run tests, lint, typecheck and build. Report any test not run because an external project is absent. Stop after ILM-SETUP-004.
