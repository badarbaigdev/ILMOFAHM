# Cursor Prompt 07 — ILM-SETUP-007: Vercel Preview Deployment Runbook

Implement only `ILM-SETUP-007 — Configure Vercel preview deployment runbook`.

## Deliverables

- Document how to import the GitHub repository into Vercel and set Root Directory to `apps/web`.
- Explain the required environment scopes: development/local, Vercel Preview using development or staging Supabase credentials, and Vercel Production using production-only credentials.
- Document Supabase Auth Site URL and permitted callback/redirect URLs for localhost, preview, staging and production domains.
- Document preview smoke checks: build, public page, health route, auth callbacks when configured, and confirmation that preview is not using production secrets/data.
- State clearly that Cursor cannot create/connect Vercel/Supabase/GitHub resources without authorized user-side account access. Do not invent project IDs, domains or deployed URLs.
- Avoid adding Vercel-specific custom configuration unless the default deployment needs it; do not hardcode domain-specific URLs into source code.

This issue is primarily deployment documentation and verification. Stop after ILM-SETUP-007.
