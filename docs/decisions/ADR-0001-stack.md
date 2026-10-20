# ADR-0001: Initial Stack and Deployment Boundary

- **Status:** Accepted for MVP
- **Date:** 2026-10-20

## Context

ILMOFAHM is a multi-tenant school/academy SaaS built initially by a small team using Cursor. We need strong authorization and relational data integrity, but also manageable delivery and deployment overhead. The team has selected Next.js and wants initial web deployment on Vercel.

## Decision

- Next.js App Router + TypeScript is the web app and initial server-side application boundary.
- Supabase supplies PostgreSQL, Auth, private Storage, RLS and CLI-managed migrations.
- Business features follow a modular-monolith/domain boundary within the app; mutations use server-side use-cases exposed via route handlers or server actions.
- GitHub issues/PRs/milestones track work. Vercel deploys the web app. Development/staging/production Supabase environments are isolated.
- Do not use Prisma as a second source of schema truth for the initial build; use SQL migrations and generated Supabase types where useful.
- Do not add NestJS, microservices, or a queue until a measurable requirement justifies them. Revisit durable job processing before launching large recurring notification/billing/report workloads.

## Consequences

Positive: fewer operational components; managed authentication and database; database-level defense in depth; quick preview deployments; migration history in Git.

Trade-offs: business logic must remain carefully modular inside Next.js; RLS requires disciplined testing; serverless request constraints shape background work; Supabase-specific integration needs an abstraction boundary to keep migration options open.

## Revisit when

Separate API consumers, sustained background processing, independently scaled workloads, deployment coupling, or operational measurements demonstrate a benefit to a dedicated API/worker.
