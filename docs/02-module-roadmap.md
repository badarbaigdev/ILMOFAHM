# ILMOFAHM — Module Roadmap

This roadmap describes the order of work, not a promise that every feature is in the first commercial release. Each module is developed as a vertical slice: database migration/RLS, server logic, UI, tests, docs, and acceptance evidence.

## Release goal

Deliver a safe pilot that a small number of real schools/academies can onboard and use for core records, attendance, fees, and results. Before broad launch, run a pilot, reconcile migrated data, test backup restoration, complete security review, and validate workflows with school staff.

## M0 — Engineering foundation (start here)

- Create Next.js TypeScript app under `apps/web/`.
- Define code quality commands and automated CI.
- Set up Supabase CLI, local development, initial migration conventions, and environment validation.
- Build server/browser client helpers with correct SSR cookie handling.
- Create a modest application shell and health/status check; no fake live business data.
- Connect a private GitHub repository and Vercel preview deployment using non-production variables.

**Exit gate:** clean install, lint, typecheck, tests and production build pass in CI; app preview runs; secrets are not committed; local database migrations can be applied from scratch.

## M1 — Identity, SaaS tenancy, and authorization

- Auth lifecycle: sign-in, sign-out, sign-up/invitation, email confirmation/callback, password reset, session expiry.
- `organizations`, `campuses`, `profiles`, `organization_memberships`, scoped role/permission model.
- Atomic first-organization onboarding and owner membership.
- Organization/campus switcher and membership-aware navigation.
- RLS/grants and automated tests for cross-tenant denial.
- Audit-event foundation for access/role/organization changes.

**Exit gate:** a user from organization A cannot read or mutate organization B's data through UI, URL manipulation, API calls, Storage paths, or export workflows. This must be automated, not only manually demonstrated.

## M2 — Institution and academic setup

- Organization profile, institution type (school, academy, or both), branding, language and timezone settings.
- Campus setup and access scope.
- School concepts: academic year, term, grades, sections, subjects, teacher assignments.
- Academy concepts: courses, cohorts/batches, schedules, enrollment capacity.
- Calendar and foundational configuration.

**Exit gate:** setup is configurable; school-only fields do not block academy workflows; edits are permission-checked and auditable.

## M3 — Student information and admissions

- Student and guardian records, emergency contact fields with restricted visibility.
- Verified parent/guardian-to-student relationships and access rules.
- Admission applications and status transitions.
- Enrollment, identifiers, promotion/transfer/withdrawal history.
- CSV import with preview, validation, duplicate review and downloadable errors.

**Exit gate:** imports are repeatable and reconcile counts; guardian access tests deny unrelated student records; archived records retain required history.

## M4 — Attendance

- Class/batch roster and attendance session model.
- Present, absent, late, excused and configurable statuses.
- Unique constraints/idempotency to prevent duplicate session submissions.
- Corrections with reason, actor, timestamp and approval when configured.
- Authorized summaries and attendance reports.
- Notification interface; actual provider delivery only after provider configuration and consent/policy checks.

**Exit gate:** wrong campus/class and duplicate submissions are rejected; corrections are traceable; tested on mobile viewports.

## M5 — Student fees and collection ledger

- Configurable fee items, structures, schedules and student assignments.
- Challan/invoice generation with idempotency and preview/dry-run.
- Payments and receipts for approved manual channels first (cash/bank transfer reference).
- Discounts, scholarships, concessions and approvals.
- Reversals/refunds/adjustments with immutable transaction history.
- Collection, arrears and cashier reports.
- Online payment gateway adapter later, after a provider and reconciliation process are selected.

**Exit gate:** money amounts use decimal-safe database types; duplicate billing/payment callbacks do not double-charge; financial changes reconcile and are auditable.

> ILMOFAHM SaaS subscription charges paid by institutions are separate from student fee charges collected by institutions. Start with a controlled trial/activation status; automate SaaS billing only after pricing, legal terms, tax treatment and provider are decided.

## M6 — Examinations and results

- Assessment configuration and mark entry.
- School-configurable scales, weights, rounding and pass rules.
- Missing/absent/exempt/incomplete result semantics.
- Approval/publication workflow with versioned corrections.
- Student progress views and report-card export.

**Exit gate:** result calculations have table-driven unit tests; published results cannot be silently overwritten; parent/student visibility follows policy.

## M7 — Pilot readiness and operational hardening

- Core parent/teacher portal routes using relationship/membership rules.
- English/Urdu design foundations and right-to-left smoke testing.
- Operational logs, error monitoring, uptime/health checks and non-sensitive alerts.
- Backup restore rehearsal for database and separate Storage object recovery.
- Tenant isolation, authorization, security, accessibility, performance and migration testing.
- Data export, institution offboarding/retention process, support runbook and incident response.
- Pilot feedback cycle, bug fixing, school staff training and release sign-off.

**Exit gate:** no unresolved release-blocking security findings; agreed performance and recovery targets tested; school users sign off on agreed workflows; data export and restore demonstrated.

## Later, after pilot evidence

Accounting/GL, HR/payroll, procurement, inventory, library, transport, full LMS, workflow builder, complex offline synchronization, dedicated mobile apps, AI assistance, automated SaaS billing and external device integrations. Design data boundaries sensibly now, but do not implement them before the core workflows are proven.
