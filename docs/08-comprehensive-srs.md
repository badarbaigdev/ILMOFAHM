# ILMOFAHM

**INSTITUTIONAL TECHNOLOGY**  
*One system. Every institution.*

Centralized school and academy management, designed for complete institutional visibility.

## Comprehensive Product Requirements, Architecture & Delivery Specification

**Document version:** 2.0 — Expanded working baseline  
**Prepared:** 20 October 2026  
**Product category:** Multi-tenant School & Academy Management SaaS  
**Initial market:** Punjab, Pakistan; designed for later regional expansion  
**Status:** Proposed baseline for product-owner, school-stakeholder, engineering, security and QA review

> This document expands the initial ILMOFAHM requirements into a product and engineering baseline. It is not a legal opinion, a final vendor contract, or a substitute for stakeholder workshops. Targets and launch scope must be confirmed before becoming contractual commitments.

---

## Executive summary

ILMOFAHM is intended to be a configurable operating platform for independent schools, academies, tuition/coaching centres, and multi-campus education groups. It must support each institution's internal operations and also operate as a commercial SaaS product where new institutions can register, be approved, configure their workspace, invite staff, import data, select a plan, and eventually renew or leave the service without losing control of their records.

The product should be built as a **modular monolith**: one well-structured backend application with strict module and domain boundaries, supported by separate background workers where useful. This is preferable to starting with many microservices because it keeps deployment and debugging straightforward while preserving the ability to extract independently scaling services later.

### Decisions recommended for the initial build

1. **Frontend:** Next.js App Router and TypeScript; responsive web application first, with Progressive Web App (PWA) capabilities considered after core journeys are stable.
2. **Backend:** Next.js server-only feature modules exposed through Route Handlers and server actions, with versioned REST endpoints for external integrations where needed. Do not add a separate NestJS API in M0.
3. **Data:** Supabase PostgreSQL as the authoritative database, with SQL migrations managed by the Supabase CLI. Migration files are the schema source of truth; do not introduce Prisma as a second migration authority.
4. **Architecture:** Modular monolith with separate modules for platform administration, tenant setup, identity/access, student information, academics, attendance, fees, examinations, communication, and reports.
5. **Jobs:** Do not add Redis/BullMQ in M0. Use managed scheduled/edge functions only for bounded work that fits their runtime and reliability model; add a durable queue and worker when imports, billing, reconciliation, or exports require it. All jobs must be idempotent, retryable and observable.
6. **Frontend hosting:** Vercel connected to GitHub for automatic preview deployments and controlled production deployments.
7. **Backend/job hosting:** Initially keep server-side feature services in the Next.js application on Vercel. Do not put long-running or critical jobs in short-lived request handlers; select a managed worker/queue only after workload and operating cost are validated.
8. **Database and files:** Supabase PostgreSQL and private Supabase Storage for documents/exports, with separately planned object backup and retention. Validate database backup/PITR, connection limits and restore procedures against the chosen Supabase plan before launch.
9. **Testing:** Vitest for unit tests, Supabase CLI/local PostgreSQL tests for SQL grants and RLS, integration tests for server operations, and Playwright for critical browser journeys.
10. **Security:** Enforce authorization on the server; combine tenant scoping in the application with database constraints and, where validated, PostgreSQL Row-Level Security as defence in depth.
11. **Delivery model:** Implement vertical slices. Each module is only complete when schema, API, UI, permissions, tests, logging, documentation and acceptance checks are delivered together.
12. **Launch approach:** Private pilot with a small number of real institutions, production-like data migration rehearsal, security testing, backup restoration exercise and explicit launch approval before public signup is enabled.

Vercel is the initial host for the Next.js application and Git-based preview deployments; Supabase provides the managed database, authentication and private storage. Keep domain logic in typed server-only feature modules. Do not treat Vercel request handlers as durable workers: add a managed queue/worker when important workloads require durable retries, scheduling or execution beyond request limits.

---

## 1. Product vision, goals and principles

### 1.1 Vision

Provide one secure, dependable, easy-to-use platform for educational institutions to manage students, guardians, academic operations, collections, communications, staff and reporting. A school should be able to start small and add modules or campuses without migrating to a different product.

### 1.2 Business goals

- Onboard new schools and academies with a guided, repeatable process.
- Reduce duplicated data entry and spreadsheet-based operational work.
- Improve accuracy and traceability for attendance, fee collection and assessment results.
- Give institution leaders useful, permission-safe operational reporting.
- Offer a sustainable SaaS business with plans, trials, renewals, support workflows and controlled feature entitlements.
- Support one institution or a group of campuses without mixing data between unrelated customers.
- Establish enough technical quality to add modules without destabilizing existing modules.

### 1.3 Product principles

- **Tenant isolation before convenience:** no institution can access another institution's data through UI, API, exports, background jobs, search, cache or generated files.
- **Server-side authority:** the backend is the final authority for access control, calculations and business rules. Hiding a button in the frontend is not authorization.
- **Financial traceability:** completed payments, refunds, write-offs and accounting entries are reversed or adjusted through controlled events, not silently overwritten.
- **Configurable rules, not endless custom code:** calendars, grading, fee policies and terminology can be configured where variation is expected; avoid a generic rules engine until concrete needs justify it.
- **Audit important actions:** record who changed sensitive records, what changed, when, why when required, and which approval was used.
- **Privacy by design:** collect only necessary personal information, restrict child and safeguarding data, and do not use real student data in development environments without a documented, authorized need and protections.
- **Mobile-first everyday workflows:** attendance, quick payment lookup, parent views, notices and timetable access must work well on phones.
- **English and Urdu:** plan for Unicode, right-to-left rendering, mixed-language text, local dates and PKR even if the first screen set is English-first.
- **Recoverable operations:** backups, exports, retries, audit trails and rollback procedures are product requirements, not later infrastructure enhancements.
- **Incremental delivery:** release small verified vertical slices, not one large feature-complete build at the end.

### 1.4 Success measures to instrument

The product owner should confirm targets after pilot discovery. At minimum, measure: time to onboard a new institution; percentage of onboarding completed without engineering help; student-import success/error rate; attendance submission time; fee-challan generation failures and duplicate rate; payment reconciliation rate; parent invitation and activation rate; weekly active users by role; support tickets per institution; production error rate; API p95 latency; and tenant-isolation test results. Analytics must avoid collecting unnecessary student-identifying information.

---

## 2. Target customers, institution types and scope

### 2.1 Supported customer profiles

1. Independent private school.
2. Multi-campus school or education group.
3. Academy or coaching centre with courses, batches, class sessions, instructors and fee instalments.
4. Mixed institution that offers both school-style grades and academy-style courses.
5. Later: colleges, vocational institutions or other education operators, only after their workflows have been validated.

### 2.2 School and academy domain model

The product must not hard-code every institution into the same `class/section` model. Schools commonly use academic years, grades, sections, terms and examinations; academies often use courses, batches, cohorts, scheduled sessions, instructor assignments and rolling admissions. The platform should share foundational concepts—people, campuses, academic offerings, enrolments, schedules, attendance, charges and communications—while retaining explicit domain objects for school and academy workflows.

A school profile can enable grades/sections and year-based promotion. An academy profile can enable course catalogues, cohorts/batches, rolling enrolment, session attendance and course-completion status. Mixed institutions may enable both profiles under one organization. Terminology in navigation and printouts should be configurable where this does not alter data meaning.

### 2.3 Included in the product roadmap

- SaaS platform administration and institution onboarding.
- Organization, campus, academic session and configuration management.
- Identity, memberships, permissions and invitations.
- Admissions and student/guardian records.
- School academic structure and academy courses/batches.
- Attendance and leave.
- Student fee billing, receipts, concessions, arrears, refunds and reconciliation.
- Exams, assessments, marks, grading, result approval and report cards.
- Notices, email/SMS and approved messaging integrations.
- Role-specific dashboards and reports.
- Staff records and leave; payroll and full accounting can follow after core workflows stabilize.
- Audit logging, document handling, imports/exports and operational tooling.
- Subscription plans and entitlement controls for institutions purchasing ILMOFAHM.

### 2.4 Explicitly not required for the first public release

Unless the product owner approves otherwise, the first release should not include: a complete accounting package; full payroll; GPS fleet tracking; biometric hardware support; advanced offline synchronization; a visual workflow builder; a custom video-conferencing platform; an AI assistant that takes actions; microservices; native iOS/Android applications; or integrations with every school board/payment provider. Interfaces should permit future integrations, but unsupported promises must not be made in sales materials.

---

## 3. Commercial SaaS platform and institution onboarding

This area is a major addition to the initial draft. A product that schools can join needs platform-level workflows separate from the internal management features used by those schools.

### 3.1 Tenant lifecycle

Each tenant has a lifecycle such as `application_pending`, `trial`, `active`, `past_due`, `suspended`, `offboarding`, `closed`. Transitions must be explicit, permission-controlled and audited. The product must distinguish an organization (customer account), its institutions/campuses, user memberships, and subscription/plan records.

### 3.2 Registration and onboarding requirements

- **ILM-PLT-001:** Public visitors shall be able to request an institution workspace or start a supported signup workflow.
- **ILM-PLT-002:** Onboarding shall capture institution type, legal/trading name, contact details, primary administrator, region, timezone, preferred language and number of campuses; only necessary fields are mandatory.
- **ILM-PLT-003:** The system shall verify the primary administrator's email and provide a safe recovery path.
- **ILM-PLT-004:** The platform shall support manual approval during pilot and a configurable automated approval policy later.
- **ILM-PLT-005:** Tenant provisioning shall create the organization, default campus, initial academic setup, administrator membership and plan/trial record as one recoverable workflow.
- **ILM-PLT-006:** Provisioning shall be idempotent: retrying a failed setup cannot create duplicate tenants or initial administrators.
- **ILM-PLT-007:** An onboarding checklist shall guide the institution through branding, academic structure, fees, staff invitations, student import and parent access.
- **ILM-PLT-008:** A tenant shall be able to invite staff with expiring, single-use invitations scoped to the correct organization and role.
- **ILM-PLT-009:** Institutions shall be able to download a pre-formatted import template and see a dry-run summary before committing imported records.
- **ILM-PLT-010:** The tenant administrator shall see plan status, enabled modules, relevant usage limits, billing contacts and renewal dates according to permissions.
- **ILM-PLT-011:** Support personnel shall not receive unrestricted tenant access by default. Exceptional support access must be approved, time-limited and logged.
- **ILM-PLT-012:** Tenant closure/offboarding shall provide an authorized export, apply a documented retention period, revoke sessions and credentials, and securely dispose of data according to the approved policy.

### 3.3 Plans, trials and subscriptions

- Separate platform subscription billing from student fee collection. They must use different models, permissions, reconciliation reports and accounting categories.
- Define plans by entitlements (modules, campuses, active-student bands, storage, communication quota, support level) rather than scattering plan-name checks through application code.
- Keep a historical record of plan changes and effective dates. A plan change must not silently delete data from a previously enabled module.
- For the initial pilot, subscription payments may be handled manually while the team validates pricing. Implement subscription records and entitlement evaluation first; automate online SaaS billing only after payment-provider selection and commercial terms are confirmed.
- Define trial start/end, reminders, grace period, overdue state, renewal, cancellation, suspension and reactivation rules.
- Avoid abruptly blocking essential read/export access when a subscription expires. The exact restricted actions and grace period must be a product/business decision documented before launch.
- Maintain separate invoices and audit events for ILMOFAHM's own subscription revenue; do not mix them into the institution's student fee ledger.

### 3.4 Platform operator console

Authorized platform operators need tenant search, provisioning status, subscription state, system incident notices, feature flags, usage indicators, failed job visibility, support access requests and an audit view. It must not become a blanket route into student details. Sensitive access should require a documented business reason and, for higher-risk cases, a second approver.

---

## 4. Personas, roles and authorization model

### 4.1 Main user groups

- Platform operator / platform support administrator.
- Organization owner / group administrator.
- Campus administrator / principal.
- Admissions officer / receptionist.
- Teacher / instructor / department head.
- Accountant / cashier / finance manager.
- HR/payroll officer.
- Parent or legal guardian.
- Student.
- Librarian, transport officer, inventory officer and safeguarding/counselling professional in later phases.
- Auditor / read-only reviewer.

### 4.2 Authorization model

Use role-based access control (RBAC) combined with context-based restrictions. Role alone is insufficient. Permission checks may also depend on organization, campus, class/course assignment, student relationship, record sensitivity, workflow status and requested action. Parent-child access must be represented as a verified relationship, not inferred from matching a name or phone number.

Every protected API operation must validate authenticated identity, active membership, tenant/campus scope, permission, record relationship and allowed workflow transition. Authorization tests must cover guessed IDs, query filters, bulk endpoints, file downloads, report exports, search, background tasks and direct API calls.

### 4.3 Minimum permission design

| Capability | Platform operator | Organization owner | Campus admin | Teacher | Accountant | Parent/student |
|---|---|---|---|---|---|---|
| Manage tenant/platform plans | Controlled platform scope | View own plan | View if delegated | No | No | No |
| Manage campus configuration | No by default | Organization-wide as delegated | Assigned campus | No | Limited where applicable | No |
| Manage students | Support access only if approved | Configurable | Assigned campus | Assigned cohorts only | Fee-related fields only | Linked/own records only |
| Record attendance | No by default | If assigned | Campus override | Assigned classes/batches | No | View permitted records |
| Record/adjust fees | No by default | According to policy | Limited approvals | No | Assigned campus and duties | Pay/view own balance only |
| Enter/publish results | No by default | Configurable | Approval rights if assigned | Assigned assessments | No | View after publication |
| View safeguarding case notes | No by default | Designated need-to-know only | Designated need-to-know only | No by default | No | No |
| Export sensitive data | Explicit audited access | Permission + audit | Permission + audit | Limited | Finance-scoped | Own/linked data where allowed |

This matrix is illustrative; a detailed permission matrix must be reviewed and approved before production. Avoid granting all powers to a user merely because their title sounds senior.

---

## 5. Functional modules and testable requirements

Priorities use **P0 (must have for the pilot), P1 (next release), P2 (later)**. The product owner must approve the final release scope. Requirements in each module should be expanded into tickets and a traceability matrix before implementation.

### 5.1 Identity and access (P0)

- **ILM-IAM-001:** Support secure sign-in, sign-out, email verification, password/account recovery and session revocation.
- **ILM-IAM-002:** Support MFA for privileged accounts; make stronger authentication available according to the chosen identity provider and rollout policy.
- **ILM-IAM-003:** Support organization membership, invitations, role assignment, user deactivation and removal from an organization without deleting their historical audit identity.
- **ILM-IAM-004:** A user may belong to more than one organization; the active organization/campus context must be explicit and validated server-side on every request.
- **ILM-IAM-005:** Staff permissions shall be limited by role and assigned campus/classes/courses where applicable.
- **ILM-IAM-006:** Parent access shall require an approved guardian-to-student relationship and shall support relationship status changes and access disputes.
- **ILM-IAM-007:** The system shall rate-limit sensitive authentication endpoints and detect repeated failed attempts without leaking account existence unnecessarily.
- **ILM-IAM-008:** Administrative privilege changes, invitations, account recovery and membership changes shall be audited.

**Acceptance examples:** changing `organizationId` in a request does not grant access; deactivated users cannot use old sessions; expired invitations are rejected; parent A cannot view parent B's child even when IDs are guessed; tenant switching loads only memberships the user actually holds.

### 5.2 Organization, campus and setup (P0)

- **ILM-ORG-001:** Support an organization with one or multiple campuses/branches.
- **ILM-ORG-002:** Store the institution operating profile (school, academy, mixed) and enable only relevant workflows.
- **ILM-ORG-003:** Support academic years/sessions, terms, holidays, working days, timezone and local calendar settings.
- **ILM-ORG-004:** Configure grades, sections, subjects, departments, courses, batches/cohorts and instructors as appropriate for the institution profile.
- **ILM-ORG-005:** Support campus branding, contact details, receipt/report templates and authorized configuration overrides.
- **ILM-ORG-006:** Configuration changes shall record the editor, timestamp, before/after values for critical settings and effective date where appropriate.
- **ILM-ORG-007:** Academic-year rollover shall include a preview, validation report and explicit confirmation; it must not promote or archive records silently.

### 5.3 Admissions and student information (P0)

- **ILM-ADM-001:** Create an admission enquiry/application online or through authorized staff entry.
- **ILM-ADM-002:** Track review, document requirements, assessment, waitlist, offer, rejection, acceptance and enrolment states.
- **ILM-ADM-003:** Generate a unique student identifier within the documented uniqueness scope; allow safe external identifiers where required.
- **ILM-ADM-004:** Maintain student profiles, guardian links, emergency contacts and enrollment history with field-level restrictions for sensitive information.
- **ILM-ADM-005:** Support school enrollment in grade/section and academy enrollment in course/batch/cohort.
- **ILM-ADM-006:** Detect possible duplicate students/guardians and offer a controlled review/merge process; do not automatically merge records based only on matching names.
- **ILM-ADM-007:** Support promotion, section/batch/campus transfer, withdrawal, completion, readmission and inactive status with effective dates and reasons.
- **ILM-ADM-008:** Import spreadsheet records through a dry-run, field mapping, required-field validation, duplicate review, error export and post-import reconciliation report.
- **ILM-ADM-009:** Documents shall be stored privately, linked to an authorized record, scanned/validated and accessed through short-lived authorized URLs.
- **ILM-ADM-010:** Sensitive medical, custody and safeguarding information shall be separated by permission and not exposed in general student exports.

**Acceptance examples:** a failed import leaves no partial untracked batch; duplicate detection produces review candidates; transferring a student preserves historical attendance/results/charges; withdrawal stops future billing according to configured policy but does not erase historical balances.

### 5.4 Academic structure, courses and schedules (P0 core; advanced scheduling P1)

- **ILM-ACA-001:** Support school grades, sections, subjects, academic-year enrolments and assigned teachers.
- **ILM-ACA-002:** Support academy course catalogues, batches/cohorts, instructor assignments, course start/end dates and rolling enrolment where enabled.
- **ILM-ACA-003:** Schedule lessons/class sessions, rooms or online locations, staff and student groups.
- **ILM-ACA-004:** Detect basic teacher and room conflicts; report student-group conflicts where the timetable model supports them.
- **ILM-ACA-005:** Publish timetables and notify affected recipients when approved changes occur.
- **ILM-ACA-006:** Support substitutions, cancelled sessions and rescheduling with reason and audit history.
- **ILM-ACA-007:** Maintain configurable term/calendar dates, assessment types and school/course completion status.
- **ILM-ACA-008:** Support homework/resources as P1; full learning management, quizzes and analytics are P2.

### 5.5 Attendance and leave (P0)

- **ILM-ATT-001:** Record daily and/or period-wise attendance for assigned classes or academy sessions.
- **ILM-ATT-002:** Support configured statuses such as present, absent, late, excused, leave and not-applicable; define how each status affects reporting.
- **ILM-ATT-003:** Prevent unauthorized staff from recording attendance for unassigned groups unless delegated.
- **ILM-ATT-004:** Allow correction only according to policy, requiring a reason and retaining the previous value and actor.
- **ILM-ATT-005:** Support attendance drafts and explicit submission; show clear success/failure feedback and prevent accidental duplicate submission.
- **ILM-ATT-006:** Configure parent notifications for defined absence/late patterns, with quiet hours, message templates and delivery logs where supported.
- **ILM-ATT-007:** Provide summaries by date range, student, group, campus and institution, always respecting authorization.
- **ILM-ATT-008:** Support staff leave requests and approvals; staff time-clock/biometric workflows are P2.
- **ILM-ATT-009:** If offline capture is added, it must identify unsynchronized records, handle conflicts explicitly and prevent duplicate attendance entries. Do not promise offline mode before that design is implemented and tested.

### 5.6 Student fee billing and collections (P0)

- **ILM-FEE-001:** Configure fee heads and fee structures by campus, academic year, grade/course/batch, student category and effective date.
- **ILM-FEE-002:** Support one-time, monthly, term-based, course-based, installment and custom billing schedules.
- **ILM-FEE-003:** Support itemized challans/invoices with unique identifiers, billing periods, due dates, line items and totals.
- **ILM-FEE-004:** Apply approved concessions, sibling discounts, scholarships, waivers and installment rules transparently.
- **ILM-FEE-005:** Support partial payments, advances, arrears, credit balances and approved late fees.
- **ILM-FEE-006:** Record cash/bank/manual collection and generate traceable receipts. Payment gateway methods are enabled only after the provider is selected and tested.
- **ILM-FEE-007:** Use idempotency keys and provider event IDs to prevent duplicate electronic payments and duplicate challan generation.
- **ILM-FEE-008:** Reconcile payment records and report unmatched, failed, duplicate, reversed and pending transactions.
- **ILM-FEE-009:** Handle refund, reversal, write-off and adjustment using controlled permissions, required reasons and configurable approval thresholds.
- **ILM-FEE-010:** Preserve a complete ledger/audit trail for completed transactions; never silently edit a completed payment.
- **ILM-FEE-011:** Provide day-end cashier closing, collection summaries, arrears, concessions, receipts and campus/group collection reports.
- **ILM-FEE-012:** Every billing run shall have a run ID and preview/error report; rerunning the same period cannot generate duplicate charges.
- **ILM-FEE-013:** Define billing behaviour for new enrolments, withdrawals, transfers, mid-period admissions, fee changes, unpaid old invoices and academic-year rollover.
- **ILM-FEE-014:** Financial hardship/concession details shall be visible only to authorized personnel.

**Acceptance examples:** totals are calculated on the server; double-clicking or retrying does not duplicate payment; refund does not delete original receipt; a billing run reports skipped students; concurrent cashiers cannot silently overwrite the same transaction.

### 5.7 Examinations, assessment and results (P0 basic; advanced analytics P1)

- **ILM-EXM-001:** Configure exam/assessment events, components, subjects/courses, dates and maximum marks.
- **ILM-EXM-002:** Support configurable marks, weights, grades, pass thresholds and absent/exempt/incomplete cases.
- **ILM-EXM-003:** Validate marks and calculations on the server, including zero, maximum marks, rounding and missing-component rules.
- **ILM-EXM-004:** Support mark entry, draft, verification, approval and publication statuses.
- **ILM-EXM-005:** Prevent unauthorized edits after publication; corrections must require permission, reason and version history.
- **ILM-EXM-006:** Generate report cards/transcripts from approved results with the correct institution/year template.
- **ILM-EXM-007:** Support class/subject/individual summaries and configurable ranks only when institution policy enables them.
- **ILM-EXM-008:** Do not permit AI or automated heuristics to change grades or make admission/progression decisions without an authorized, accountable human decision.

### 5.8 Communication and notifications (P0 basic; automation P1)

- **ILM-COM-001:** Publish announcements to selected organizations, campuses, classes, courses, staff groups or parents according to authorization.
- **ILM-COM-002:** Provide in-app notification records and an adapter architecture for email, SMS and approved messaging providers.
- **ILM-COM-003:** Store template, intended audience, sending status, retry count and provider reference without logging sensitive payloads unnecessarily.
- **ILM-COM-004:** Support failed-delivery retry and operator visibility; prevent accidental duplicate broadcast on a retried job.
- **ILM-COM-005:** Respect language, recipient preferences, quiet hours and consent/legal requirements where applicable.
- **ILM-COM-006:** Avoid sending detailed grades, medical details, fee hardship information or other sensitive information through unapproved channels.
- **ILM-COM-007:** Keep a history of consent forms, circular acknowledgements and important parent-school interactions where the institution requires it.

### 5.9 Parent and student portals (P0 read-only essentials; extended collaboration P1)

- **ILM-PORT-001:** Present a role-specific dashboard and only the modules the user is entitled to access.
- **ILM-PORT-002:** Parents may view only verified linked children, permitted attendance, timetable, results, notices and fee information.
- **ILM-PORT-003:** Students may view only their own permitted schedule, homework, results and learning resources, according to the institution's age and policy rules.
- **ILM-PORT-004:** Support a parent's multiple children without mixing sibling records or authorizations.
- **ILM-PORT-005:** Provide secure invitation, guardian verification, relationship update and access-revocation workflows.
- **ILM-PORT-006:** Parent-teacher appointment booking, homework submissions and acknowledgements may be delivered after core access is stable.

### 5.10 Documents, templates and exports (P0)

- **ILM-DOC-001:** Support institution-specific templates for admission forms, fee receipts/challans, notices and basic report cards.
- **ILM-DOC-002:** Store private documents in object storage; public bucket URLs are not permitted for student documents.
- **ILM-DOC-003:** Validate extension, MIME/content, size and permissions; scan uploads for malware using an appropriate service/process.
- **ILM-DOC-004:** Generate large exports asynchronously, notify the requester when ready, and issue short-lived download links.
- **ILM-DOC-005:** Record who requested and downloaded sensitive exports, with filters matching their allowed record scope.
- **ILM-DOC-006:** Define retention and deletion rules for uploaded documents and generated exports.

### 5.11 Reporting and dashboards (P0 essential reports)

- **ILM-REP-001:** Provide essential dashboards for enrollment, attendance, student balance/collection and assessment progress.
- **ILM-REP-002:** Define each metric precisely, including timezone, status filters, date range and treatment of withdrawn/inactive students.
- **ILM-REP-003:** Reports and exports must enforce the same tenant/campus/record permissions as normal screens.
- **ILM-REP-004:** Each report shall show the reporting period, applied filters and generation timestamp.
- **ILM-REP-005:** Export files shall include only authorized columns/records and use safe spreadsheet output escaping.
- **ILM-REP-006:** Background report generation shall have status, cancellation policy, retry control and failure observability.
- **ILM-REP-007:** Cross-campus consolidated reporting is available only to explicitly authorized organization-level users.
- **ILM-REP-008:** Advanced anomaly detection and AI narrative summaries are P2; any generated interpretation must be distinguishable from source data.

### 5.12 Staff, HR and payroll (P1)

- **ILM-HR-001:** Maintain employee profile, role, qualifications, employment dates and assigned institution/campus.
- **ILM-HR-002:** Manage leave requests, approvals, leave balances and attendance according to defined policies.
- **ILM-HR-003:** Restrict salary, disciplinary and personnel records to named roles with audit logging.
- **ILM-HR-004:** Payroll shall define pay periods, salary components, allowances, deductions, adjustments, approval, payslips and export/reconciliation rules before implementation.
- **ILM-HR-005:** Payroll and tax calculations must be configurable only after validation by qualified local accounting/legal experts.

### 5.13 Accounting and procurement (P1/P2)

- **ILM-FIN-001:** Keep institutional financial accounting separate from ILMOFAHM SaaS subscription billing.
- **ILM-FIN-002:** If the full accounting module is enabled, support a chart of accounts, double-entry ledger, journal entries, receivables/payables and reconciliation.
- **ILM-FIN-003:** Posted ledger entries must be immutable in normal workflows; corrections must use reversal/adjustment entries.
- **ILM-FIN-004:** Support budgets, expense approvals, vendors, purchase requests, purchase orders, bills and payment tracking in a later phase.
- **ILM-FIN-005:** Period closing, opening balances, audit reports and backdated adjustments require explicit policies and permissions.
- **ILM-FIN-006:** Tax, invoicing and financial reports must be reviewed against current applicable local requirements before release.

### 5.14 Future operations modules (P2)

Transport/fleet, library, inventory/assets, procurement, safeguarding/counselling, learning resources, biometric/RFID, GPS, advanced offline mode and AI may be introduced after core workflows are stable. Each requires an individual domain design, permissions model, data classification, operational owner and acceptance suite. Safeguarding notes must be need-to-know records, not ordinary student-profile fields.

---

## 6. Core end-to-end journeys

The product must be verified through complete user journeys, not only through individual forms.

### Journey A: New institution joins ILMOFAHM

1. Institution submits signup/application.
2. Email is verified and onboarding data is validated.
3. Platform policy approves or rejects the application.
4. Idempotent provisioning creates organization, campus, owner membership, default configuration and trial/plan record.
5. Owner completes setup, invites staff and imports sample/real data under controlled validation.
6. Owner reviews onboarding status and chooses to continue into the active plan.
7. Audit and operational logs show each provisioning step and any failure.

### Journey B: Admission to enrolled student

1. Authorized user receives enquiry/application.
2. Required fields/documents are validated.
3. Admissions staff reviews, requests missing information and approves/rejects.
4. Accepted applicant is enrolled into a grade/section or a course/batch.
5. A unique student record and guardian relationship are created or safely linked.
6. An initial billing decision is made under institution rules.
7. Parent invitation is issued; the new relationship cannot be used until verified/approved.

### Journey C: Attendance from phone

1. Teacher signs in and selects an assigned group/date/session.
2. The system displays only the correct roster.
3. Teacher records attendance, sees missing entries and saves/submits.
4. API validates assignment, date, status and duplicate submission.
5. The system confirms the saved state and writes the audit record.
6. Eligible notifications are queued once and delivery state is tracked.
7. Authorized users can correct attendance through a reasoned correction flow.

### Journey D: Monthly fee collection

1. Authorized accountant previews the next billing run.
2. The system calculates eligible students and line items using a versioned fee configuration.
3. Accountant reviews exceptions and confirms generation.
4. Billing run creates unique invoices/challans transactionally or through resumable batches.
5. Cash/bank/digital payment is recorded and produces a receipt.
6. Duplicate callbacks or retries are ignored idempotently.
7. Reconciliation and day-end reports match payments against invoices and cash/bank totals.
8. Refunds/adjustments preserve original history and use approval rules.

### Journey E: Assessment, approval and publication

1. Exam/assessment is configured with validated grading rules.
2. Assigned teacher enters marks and saves a draft.
3. Validation flags out-of-range marks and unresolved missing values.
4. Reviewer approves results.
5. Publication locks ordinary editing and generates report cards.
6. Later correction requires privileged action, reason and version history.
7. Parent/student portals reveal results only after publication and according to policy.

### Journey F: School leaves the service

1. Authorized owner requests closure and verifies authority.
2. System identifies subscription, campuses, users, integrations, pending jobs and retention obligations.
3. Owner generates an auditable export in documented formats.
4. Data is marked for closure; new writes and credentials are disabled under policy.
5. The agreed retention period and legal holds are applied.
6. Tenant-specific storage and data are deleted or anonymized when policy permits; deletion evidence is logged.

---

## 7. Recommended application architecture

### 7.1 Architecture style

Begin with a modular monolith in Next.js, backed by Supabase managed services. Modules should own their schemas, services/use-cases, queries, authorization checks and tests. Direct cross-module writes should be avoided; cross-module workflows should use explicit application services and transactions where needed. Add a separately running worker only when measured workloads require durable asynchronous processing.

Do not split the system into microservices just because modules exist. Consider extracting a service only after evidence shows a distinct scaling, resilience, team ownership or isolation need.

### 7.2 Logical layout

```text
Users: platform operators | school/academy staff | guardians | students
                               |
                    Next.js application
                    UI + server-only modules
                       hosted on Vercel
                               |
       +-----------------------+-----------------------+
       |                       |                       |
   Supabase Auth         Supabase PostgreSQL     Supabase Storage
   sessions/identity     RLS + SQL migrations   private documents
                               |
                  Optional durable job/worker layer
                  only when workload requires it
```

External providers connect through adapters: email, SMS, approved WhatsApp Business provider, payment gateway, authentication/OIDC, and optional future hardware/learning platforms. Provider-specific details must not become the internal domain model.

### 7.3 Proposed repository structure

Use the following initial repository structure to match the starter package. Add workspace packages only when reuse or build performance gives a concrete benefit:

```text
apps/
  web/                 # Next.js UI and server-side feature modules
supabase/
  migrations/          # versioned SQL schema, grants and RLS policies
  tests/               # SQL/RLS policy tests
  seed.sql             # synthetic local-only fixtures
docs/                  # architecture, roadmap, decisions and runbooks
scripts/               # repeatable development/backlog automation
```

Avoid sharing backend database models directly into the browser. Shared contracts should describe safe API payloads only. Keep domain types, authorization checks and secrets inside server-side packages.

### 7.4 API design

- Use Next.js Route Handlers and server actions as the initial server-side entry points. Use an `/api/v1` prefix and OpenAPI documentation for stable external integration/webhook endpoints when required; do not duplicate internal operations across a separate API prematurely.
- Validate all input at the backend boundary, including query parameters, uploaded metadata and path IDs.
- Use consistent error shapes with a machine-readable code, safe user-facing message, request/correlation ID and field-level validation details where appropriate.
- Use cursor pagination for large collections where it is appropriate; enforce reasonable maximum page sizes.
- Define filtering, sort allowlists and response DTOs explicitly.
- Use idempotency keys for high-risk writes such as payment callbacks, fee generation and retryable commands.
- Use optimistic concurrency/version checks for records that can be edited by multiple staff concurrently.
- Version externally consumed API/webhook contracts and document breaking-change policy.
- Protect webhooks using signature verification, timestamp/replay controls where supported, allowlists only when provider guidance supports them, and idempotent processing.

### 7.5 Database and tenant isolation

- PostgreSQL is the authoritative data store for product records.
- Every tenant-owned record must have a clear ownership path. High-risk domain tables should include `organization_id` or an equivalent enforceable ownership relationship, not rely solely on fragile joins.
- Unique constraints should normally include the tenant scope where IDs are not globally unique.
- All tenant-scoped repositories/services must require an explicit validated tenant context; never accept tenant ownership solely from an untrusted client payload.
- Test cross-tenant isolation for normal APIs, admin endpoints, SQL queries, background jobs, notifications, file URLs, cached responses, search and exports.
- PostgreSQL Row-Level Security may be used as defence in depth, but only after testing connection-pooling behaviour, transaction-local context and privileged database roles. It does not remove the need for application authorization tests.
- Avoid storing sensitive values in logs, analytics, job payloads or URLs. Secrets, tokens and signed document links must not be persisted in plain audit descriptions.
- Use database constraints for invariant rules such as uniqueness and valid foreign keys, and transactions for operations that must commit or roll back together.
- Use migration files reviewed in pull requests. Production schema changes must use a safe expand/migrate/contract pattern for deployments that cannot stop all traffic.

### 7.6 Minimum domain entities

The initial data model should explicitly design relationships for at least:

- Platform: `Organization`, `Campus`, `TenantDomain/Slug`, `Plan`, `Subscription`, `Entitlement`, `ProvisioningJob`, `PlatformAuditEvent`.
- Identity: `User`, `OrganizationMembership`, `Role`, `Permission`, `Invitation`, `Session/IdentityReference`, `GuardianStudentRelationship`.
- Academics: `AcademicYear/Session`, `Term`, `Grade`, `Section`, `Subject`, `Course`, `Batch/Cohort`, `ClassSession`, `Enrollment`, `TeacherAssignment`, `TimetableSlot`.
- Student records: `Student`, `Guardian/Contact`, `AdmissionApplication`, `StudentDocument`, `EnrollmentHistory`, `Transfer/Withdrawal`.
- Attendance: `AttendanceSession`, `AttendanceRecord`, `AttendanceCorrection`.
- Fees: `FeeHead`, `FeeStructure`, `FeeRuleVersion`, `BillingRun`, `Invoice/Challan`, `InvoiceLine`, `Payment`, `PaymentAttempt`, `Receipt`, `Refund`, `CreditBalance`, `ReconciliationBatch`.
- Assessments: `Assessment`, `AssessmentComponent`, `MarkEntry`, `GradeScale`, `ResultVersion`, `PublicationEvent`, `ReportCard`.
- Communication: `NotificationTemplate`, `NotificationJob`, `DeliveryAttempt`, `Announcement`, `Acknowledgement`.
- Operations: `AuditEvent`, `ImportBatch`, `ImportRowError`, `ExportJob`, `FileObject`, `IntegrationConnection`, `WebhookEvent`, `BackgroundJobReference`.

Names can change after detailed data modeling. The required outcome is a documented ERD, data dictionary, sensitivity classification, lifecycle policies and tenancy ownership for every entity before implementation of the corresponding module.

### 7.7 Consistency, asynchronous jobs and event delivery

- Use a database transaction for business operations that span multiple writes and must be all-or-nothing.
- For important events that need both a DB commit and a queued job, use a transactional outbox or equivalent reliable pattern so a committed payment/attendance record cannot lose its required follow-up notification silently.
- Jobs must be idempotent and carry tenant context and a correlation ID; they must not rely on an ambient global tenant.
- Configure bounded retries with exponential backoff and dead-letter/error visibility for repeated failures.
- Separate user-facing requests from bulk imports, report exports, scheduled billing and large message broadcasts.
- Never assume “exactly once” delivery from queues or external providers. Design for at-least-once delivery and deduplication.

---

## 8. Technology stack and tooling

The listed choices are a recommended starting stack, not a requirement to buy every vendor product immediately. Re-check current pricing, regional availability, data handling, support and production limits before selecting providers.

| Area | Recommendation | Reason / guardrail |
|---|---|---|
| Frontend framework | Next.js App Router + TypeScript strict mode | Strong React ecosystem; suitable for public pages and authenticated app workflows. |
| Styling/components | Tailwind CSS + shadcn/ui/Radix primitives | Consistent reusable UI; the team owns copied components and must maintain accessibility. |
| Forms/validation | React Hook Form + Zod (or equivalent schema validation) | Good form ergonomics; repeat all security-critical validation on the backend. |
| Server state | TanStack Query where interactive API state benefits | Caching, retries and invalidation; never treat client cache as authority. |
| Backend | Next.js server-only feature modules + Route Handlers/server actions | Keeps deployment simple for the initial team while preserving testable domain boundaries. Reassess a separate API only when measurable needs justify it. |
| API spec | OpenAPI/Swagger | Contract review, API testing and future integration documentation. |
| Database | Supabase PostgreSQL | Transactions, relational integrity, indexing, managed operations and database-level RLS. |
| ORM/migrations | Supabase CLI + versioned SQL migrations | One schema source of truth; reviewed policies, grants, constraints and migrations. Use typed Supabase clients for application queries. |
| Queue | Not introduced in M0; add managed queue/worker when justified | Avoid operating a queue before needed; critical/bulk jobs must eventually have durable retries, deduplication, monitoring and recovery. |
| File storage | Private Supabase Storage buckets | Object-level access policies, short-lived links, lifecycle/retention and separate object backup requirements. |
| Authentication | Supabase Auth with secure SSR session integration | Verify invitation, account recovery, session revocation and MFA behavior; ILMOFAHM membership/role records remain authoritative for institutional authorization. |
| Unit tests | Vitest | Fast unit tests for domain rules, validation and server-side feature services. |
| Database/API integration tests | Supabase local stack/CLI and request-level tests | Verify migrations, grants, RLS, validation, permissions and transaction behavior against isolated fixtures. |
| Browser tests | Playwright | Tests end-to-end journeys in supported browsers. |
| CI/security | GitHub Actions, Dependabot, CodeQL or equivalent scanners, secret scanning | Pull-request gates, dependency review, leak prevention and reproducible releases. |
| Error/performance monitoring | Sentry or equivalent; OpenTelemetry where practical | Errors, request correlation, latency and operational alerts. Avoid personal data in telemetry. |
| Product analytics | Privacy-configured analytics after consent/policy review | Adoption and funnel measurement without student profiling or unnecessary personal data. |
| Localization | next-intl or equivalent with RTL-aware design tokens | English/Urdu translation, layout direction and locale-aware formatting. |
| Design | Figma and a documented component/design-token library | Consistent screens and reviewable design decisions. |

### 8.1 Authentication provider decision

Use Supabase Auth for the initial identity layer and prove these flows before relying on it: one adult user who belongs to multiple institutions, owner invitation, parent account linked to a child, MFA for a privileged user, account recovery, session revocation, and deactivation. Verify that Auth identities map safely to internal profiles/memberships. All role, campus, student and tenant authorization remains in ILMOFAHM's server-side domain and PostgreSQL policies.

### 8.2 Hosting and deployment decision

- **Vercel:** Next.js application, public entry page, preview deployments and controlled production releases.
- **Application server logic:** Next.js Route Handlers/server actions and server-only feature services, with strict request validation and authorization. Keep high-volume or long-running jobs out of request handlers.
- **Worker (future):** Add a managed worker and durable queue when approved workloads require independent runtime, scheduling, retries or scaling.
- **Database:** Supabase PostgreSQL with reviewed RLS/grants, a migration release process, backups and tested restore procedures.
- **Queue (future):** Select a managed queue only after confirming workload, retry, scheduling, monitoring, and cost requirements.
- **Object storage:** Private Supabase Storage buckets with object access policies; plan backup and retention separately from database backups.
- **Domains:** Example topology only: `www.example.com` for marketing, `app.example.com` for users, `api.example.com` only if a separate external API is introduced, and `staging.example.com` for staging. Choose actual domains after brand/domain checks.

The selected initial architecture is Next.js on Vercel plus Supabase managed services. This can support the first production release only if request/runtime limits are respected, database access and RLS are tested, backups are restorable, and critical long-running work is moved to durable job processing when required. A deployed URL alone is not evidence of production readiness.

---

## 9. Non-functional requirements and operational targets

The numbers below are initial engineering targets. They must be tested against a defined workload and budget; they are not promises until the hosting, monitoring, backup and support setup can meet them.

| ID | Quality attribute | Initial target / requirement |
|---|---|---|
| ILM-NFR-001 | Responsiveness | For agreed common read endpoints, p95 response time target ≤ 2 seconds under an agreed test load, excluding large reports/exports. |
| ILM-NFR-002 | Availability | Pilot target 99.5% monthly service availability; revisit 99.9% only when operations, redundancy and support processes justify it. |
| ILM-NFR-003 | Capacity | Approve a capacity model stating expected institutions, campuses, students, active users, concurrency, data growth and bulk-job volume before load testing. |
| ILM-NFR-004 | Recovery | For pilot, propose RPO ≤ 24 hours and RTO ≤ 8 hours, then improve based on business impact and verified capabilities. Critical financial operations may require stronger targets. |
| ILM-NFR-005 | Data integrity | No silently lost confirmed fee/payment/result/attendance writes; use transactions, idempotency and reconciliation. |
| ILM-NFR-006 | Tenant isolation | All tenant access tests must pass; any confirmed cross-tenant data disclosure is a release blocker. |
| ILM-NFR-007 | Accessibility | Target WCAG 2.2 AA for core journeys; validate using automated tools and manual keyboard/screen-reader review. |
| ILM-NFR-008 | Localization | English/Urdu-ready data model and layouts; test RTL, long names, mixed scripts, dates, numbers and print/PDF output. |
| ILM-NFR-009 | Browser support | Publish a supported browser/device matrix and verify mobile Safari/Chrome plus current major desktop browsers. |
| ILM-NFR-010 | Maintainability | Versioned migrations, API documentation, code review, automated critical-path tests and documented module ownership. |
| ILM-NFR-011 | Observability | Structured logs, request/job correlation IDs, error alerts, health checks and a documented on-call/escalation owner. |
| ILM-NFR-012 | Portability | Tenant administrators can export their authorized data in documented formats before closure, subject to legal/retention rules. |
| ILM-NFR-013 | Security | No unresolved critical/high release-blocking security findings under the approved policy; test against OWASP ASVS and a current threat model. |
| ILM-NFR-014 | Privacy | No real student data copied to ordinary dev/test environments; use synthetic fixtures and masked data for troubleshooting. |
| ILM-NFR-015 | Cost controls | Alerts for database size, storage, queue backlog, messaging spend, build minutes and provider usage where available. |
| ILM-NFR-016 | Deployment safety | Separate local/preview/staging/production configuration; migrations and deployments have rollback/forward-fix plans. |

RPO (Recovery Point Objective) is the targeted maximum amount of data loss measured in time. RTO (Recovery Time Objective) is the targeted time to restore the service. These objectives must be supported by the actual backup frequency, provider features and restoration tests.

---

## 10. Security, privacy and safeguarding

### 10.1 Threat model

Assume the platform may face: a user guessing another tenant's record ID; an over-privileged staff account; a stolen parent session; malicious spreadsheet/file uploads; insecure direct object references; repeated password attempts; forged/replayed payment callbacks; duplicate queued jobs; exposed environment variables; insecure preview deployment; SQL injection or cross-site scripting; malicious insiders; accidental exports; compromised third-party credentials; and incomplete tenant closure.

Maintain a threat model and update it as features, providers, roles and data sensitivity evolve.

### 10.2 Required controls

- TLS for data in transit and encryption at rest through managed services; verify the provider's configuration and backup encryption.
- Secrets only in the hosting secret manager/environment settings; never commit `.env` files, API keys, certificates or production data.
- Strong session/token validation, secure cookies where used, appropriate CSRF protections for cookie-authenticated flows, CORS allowlists and rate limits.
- Backend authorization on every protected action; tenant scope must not be derived solely from request payloads.
- MFA available for platform operators and institution owners; policy can require it for sensitive roles.
- Audit events for membership changes, role/permission changes, sensitive exports, result publication/correction, financial adjustments, support access and tenant lifecycle actions.
- File upload allowlists, content/size limits, malware checks, private storage and short-lived download URLs.
- Safe spreadsheet export to reduce formula-injection risk.
- Payment secrets and webhook signatures protected; never store card data unless an independently reviewed, compliant payment architecture requires it. Prefer hosted/tokenized payment components from the selected provider.
- Background jobs run with minimal required permissions and use tenant-scoped payloads.
- Dependency scanning, lockfile review, code scanning, patch policy and secure GitHub Actions permissions.
- Separate dev, preview, staging and production secrets/data. Avoid production secrets in untrusted fork PR deployments.
- Security incident response procedure with owner, severity levels, evidence preservation, containment, notification decision and post-incident actions.
- Backups protected from ordinary application deletion and tested by restoration, not merely checked for successful creation.
- Support access is least privilege, time-limited and audited; do not create a default support backdoor.

### 10.3 Child and sensitive data

- Maintain a data inventory and classify fields (public, internal, confidential, highly sensitive).
- Minimise fields collected for students and guardians; define purpose and retention for each category.
- Restrict medical, custody, disciplinary and safeguarding data to designated roles.
- Verify guardian relationships before enabling portal access and provide a controlled path to suspend/change access during custody or contact disputes.
- Do not use student records to train third-party AI models without explicit approved legal/privacy review and a suitable contractual basis.
- Do not use AI for autonomous admission decisions, grading, discipline, safeguarding severity or other consequential judgments.
- Provide a process for handling a school/guardian request to review, correct or export records, subject to validated law and school policy.

### 10.4 Legal and regulatory review

Before public launch, obtain qualified Pakistani legal/accounting advice on applicable privacy, cybercrime, children’s data, education-sector registration, tax/invoicing, payments, messaging/marketing and contractual obligations. The legal position can change: current public legal guidance reviewed for this document describes Pakistan’s Personal Data Protection Bill, 2023 as remaining at bill/draft stage, while the Punjab legal portal lists a 2026 amendment to the private educational institutions framework. This must be re-verified by counsel against authoritative legislation and commencement/implementation notifications before launch; do not market ILMOFAHM as compliant with a statute merely because the draft follows good privacy practices.

### 10.5 Security baseline

Use the stable OWASP Application Security Verification Standard (ASVS) as a source for application security requirements; maintain the chosen version in the project security checklist. For early releases, explicitly test authentication, session management, authorization, tenant boundaries, input validation, file handling, API abuse, secrets, dependencies and audit integrity. Arrange an independent penetration test before broad public rollout or after significant security-sensitive architecture changes.

---

## 11. Data governance, migrations and retention

### 11.1 Data dictionary and ownership

Before each module is built, document fields, data type, validation, uniqueness, sensitivity, tenant owner, source of truth, retention, export inclusion and allowed transitions. Never add a new student-related field simply because it may be useful later; specify a purpose and who is allowed to view it.

### 11.2 Imports and data migration

- Provide sample templates, field mapping, preview/dry-run and actionable row-level errors.
- Validate duplicates and referential integrity before committing.
- Process large imports as resumable background jobs with batch IDs and progress.
- Preserve source IDs where they help reconciliation, but do not trust an imported tenant ID or role.
- Produce post-import counts and reconciliation reports; require an authorized person to sign off before the old system is retired.
- Support a documented rollback or compensating procedure for failed imports.
- Use synthetic data in dev/test and masked data for approved debugging.

### 11.3 Retention and deletion

Define retention by record category: academic history, receipts/financial ledger, student documents, support logs, audit records, notification content, generated files, inactive accounts and backups. Legal retention and school contract terms may differ. A record's normal UI deletion should not bypass financial/audit retention requirements. Tenant closure must include export, access revocation, scheduled deletion/anonymization and treatment of backups under the documented retention schedule.

---

## 12. Quality engineering and testing strategy

Testing must run continuously during each module's development—not just before the end. The CI pipeline should reject changes that fail mandatory quality gates.

### 12.1 Test layers

1. **Static checks:** formatter, lint, TypeScript strict checks, dependency/security scans, secret scanning and migration review.
2. **Unit tests:** fee rules, grading rules, permission helpers, tenant-context resolution, state transitions, billing calculations and validation.
3. **Database/integration tests:** constraints, transactions, repository scoping, migrations, duplicate request handling and rollback behaviour against an isolated PostgreSQL instance.
4. **API tests:** authentication, authorization, schema validation, status codes, error format, rate limits and API compatibility.
5. **End-to-end tests:** signup/onboarding, invitation, admission, student enrollment, attendance submission, fee billing/collection, result publication and export.
6. **Security tests:** cross-tenant access, role escalation, IDOR, parent-child boundary, forged webhooks, replay/duplicate callbacks, unsafe file access and export leakage.
7. **Performance tests:** representative reads, peak attendance entry, billing run, imports and exports with an agreed test dataset and concurrency profile.
8. **Accessibility/localization tests:** keyboard navigation, focus, screen-reader labels, contrast, mobile viewport, Urdu RTL and generated PDF/report layout.
9. **Recovery tests:** restore the database, recover private files, resume/reconcile jobs, rotate secrets and roll back/forward-fix a release.
10. **User acceptance testing (UAT):** representative school owners, office staff, teachers, accountants and parents confirm real workflows and terminology.

### 12.2 Mandatory tenant-isolation test cases

- User from tenant A requests a tenant B student directly by ID.
- User changes `organizationId`, `campusId` or student ID in a request body/query.
- User tries to view/download another tenant's document or export.
- Tenant A report filter accidentally omits tenant scope.
- Background job processes an entity ID from another tenant.
- Cache key omits tenant context and returns another institution's data.
- Search index and analytics/report exports return cross-tenant records.
- A user has memberships in tenant A and B but changes active tenant without a valid membership.
- A parent is linked to two siblings in one school but tries to access another child in a different family.
- Platform support access is used without an approved grant or after its expiry.

Any real cross-tenant data leak or reproducible unauthorized access is a production release blocker.

### 12.3 Test data and environments

Use factory-generated synthetic schools, academies, campuses, teachers, guardians, students, payments and results. Have fixtures for empty states, large classes, repeated names, Urdu/mixed-script names, students with multiple guardians, siblings, withdrawn students, reversed payments, failed jobs and boundary dates. Seed test tenants that make cross-tenant failures easy to test.

### 12.4 Definition of ready

A module is ready for development when its owner, requirements/acceptance criteria, main workflows, edge cases, permission matrix, data fields, designs, dependencies and test approach have been reviewed. Open questions that affect schema/security/financial logic must be resolved before implementation or explicitly recorded as reversible assumptions.

### 12.5 Definition of done

A feature is done only when:

- approved acceptance criteria are implemented;
- schema migration is reviewed and works on a clean database;
- frontend and API validation/error/loading/empty states are complete;
- server-side access checks are implemented and tested;
- unit, integration and relevant end-to-end tests pass;
- logging/monitoring and background-job failure handling exist where needed;
- responsive and accessibility checks are complete for the affected workflow;
- translations and RTL behaviour are checked if the screen is in scope;
- user-facing and technical documentation are updated;
- rollback/forward-fix implications are understood;
- product owner or delegated tester signs off on acceptance in staging.

---

## 13. Git, CI/CD and environments

### 13.1 Branching and reviews

- Protect `main`; direct pushes to production branch should be disabled for normal development.
- Use short-lived feature branches and pull requests.
- Require at least one review for non-trivial changes, passing CI, and migration/security review for sensitive changes.
- Keep commits and PRs focused on one module or vertical slice.
- Prefer small pull requests; do not combine unrelated refactors with financial/security feature changes.

### 13.2 Environments

1. **Local:** developers use isolated local services or disposable dev resources with synthetic data.
2. **Preview:** each pull request gets a Vercel frontend preview configured to a non-production Supabase project or approved preview branch. Use synthetic data only; do not use production secrets or records.
3. **Staging:** production-like API, worker, database configuration and integrations using sandbox credentials. No production student data by default.
4. **Production:** locked-down secrets, production provider accounts, backups, monitoring, alerting and controlled database migration.

Use separate environment variables, API keys, databases and buckets. Never point preview deployments at production data. Make sure each environment has a clearly defined identity, domain and data retention policy.

### 13.3 Pull request quality gates

At minimum run formatting/lint, type checking, unit tests, backend integration tests where practical, build validation, migration validation, dependency/security checks and relevant Playwright smoke tests. Add CodeQL or equivalent code scanning and Dependabot or an equivalent dependency update process. Lock action dependencies to verified versions/SHAs where feasible and use least-privilege CI tokens.

### 13.4 Production release procedure

1. Merge approved PR to the release branch/main.
2. Deploy to staging or select a known-good preview build.
3. Run smoke checks and core workflow regression tests.
4. Verify migrations are backward-compatible and backups are healthy.
5. Approve release and promote/deploy to production.
6. Run post-deploy health checks: authentication, tenant selection, student listing, attendance read/write, fee read/write in a safe test record, notification queue and critical reports.
7. Watch error rate, job backlog, latency and provider failures.
8. Roll back the application release or apply a forward fix according to the migration plan; database rollback must never be assumed safe for destructive migrations.

Vercel's Git integration can provide preview deployments for branch/PR changes and production deployment from the chosen branch. Treat previews as a QA convenience, not as a replacement for staging and production acceptance.

---

## 14. Module-by-module implementation roadmap

The sequence below prioritizes a safe sellable core. Dates should be assigned only after feature sizing, team capacity and the first two stakeholder workshops.

### Phase 0 — Discovery and architecture validation

**Deliverables:** stakeholder interviews; school/academy workflow maps; signed release scope; role/permission matrix; data dictionary draft; initial ERD; threat model; UI navigation/wireframes; acceptance criteria; hosting cost estimate; risk register; provider proof of concept.

**Exit gate:** no unresolved critical questions about tenant model, user identity, fee ledger, school-vs-academy structure or launch hosting.

### Phase 1 — Engineering foundation

**Build:** repository and Next.js shell; lint/type/test setup; Supabase local development; SQL migrations; Supabase Auth SSR proof of concept; safe route-handler response/error conventions; health endpoint; structured server logs; CI; environment validation; secret management; baseline audit utilities. Do not add a separate API, Prisma or worker in M0.

**Tests:** clean install/build, clean database migration, CI checks, auth smoke tests, API health, secret scanning and environment separation.

**Exit gate:** a reviewed PR can deploy a known-good frontend preview connected to a non-production Supabase environment, with no production secrets.

### Phase 2 — SaaS platform, organizations and access

**Build:** application/signup; tenant provisioning; organization/campus setup; school/academy operating profile; users/memberships/invitations; roles and permissions; onboarding checklist; plan/trial records; platform operator console; platform-level audit.

**Tests:** duplicate provisioning retries; invitation expiry; role escalation tests; active tenant switching; tenant A/B access tests; tenant offboarding/export smoke test.

**Exit gate:** a new demo tenant can be created and configured without manual database editing, and isolation tests pass.

### Phase 3 — Students, admissions and academic setup

**Build:** student/guardian model; admissions; enrolments; grades/sections; academy courses/batches; campus assignment; import templates/dry-run; private documents; enrollment/transfer history.

**Tests:** duplicates; guardian linking; import failure/rollback; promotion/transfer; withdrawn student; tenant isolation across queries and files.

**Exit gate:** institution can import a validated sample roster, find an individual record and prove records remain isolated from other tenants.

### Phase 4 — Attendance and core communication

**Build:** class/session roster; attendance statuses; draft/submit/correction; teacher assignment checks; attendance summaries; in-app notifications and one initial outbound channel if configured.

**Tests:** mobile viewport; unauthorized class; incomplete roster; double submission; correction history; delivery retry/deduplication; tenant-safe reports.

**Exit gate:** a teacher can record a normal session from a phone, with audit evidence and no cross-tenant access.

### Phase 5 — Student fee billing and collections

**Build:** fee heads/structures; billing preview and runs; challans/invoices; payment recording; receipts; partial payments; concession rules; arrears; cash close; refund/reversal approval; reconciliation reports.

**Tests:** formula/rounding; rerun idempotency; partial/advance payment; late fee; cancelled/withdrawn student; refund; concurrent cashier writes; duplicate callback; ledger reconciliation.

**Exit gate:** finance stakeholder signs off on agreed scenarios and all financial acceptance tests pass. Do not enable real online payment processing until gateway and operational procedures are verified.

### Phase 6 — Assessments and results

**Build:** assessment setup; mark entry; grading scales; validation; verification/approval; publication; report cards; result correction/versioning.

**Tests:** grading edge cases, missing/exempt entries, out-of-range marks, unauthorized edits, publication lock, PDF output and parent portal visibility rules.

**Exit gate:** a complete assessment can be configured, graded, approved and published with an auditable correction workflow.

### Phase 7 — Parent portal, onboarding polish and pilot readiness

**Build:** parent verification/linking, student/parent dashboards, timetables, notices, attendance/results/fee views, notification preferences, school templates, help/support route, import reconciliation and basic usage reporting.

**Tests:** guardian relationship edge cases, multiple siblings, mobile/browser regression, bilingual/RTL core views, accessibility review, backup restore, load test and UAT.

**Exit gate:** pilot institutions sign off on the agreed workflows; no critical/high security issue remains open; recovery and support procedures are rehearsed.

### Phase 8 — Private pilot and controlled public launch

Run the pilot with a small group of selected schools/academies under a clear support channel and written expectations. Capture issues, fix priority defects, review costs and onboarding friction, and repeat regression testing. Start with manual subscription invoicing if needed. Open public self-service signup only after the launch checklist is approved.

### Phase 9 — Operational ERP and advanced capabilities

Add HR/payroll, double-entry accounting, procurement, library, inventory, transport, advanced analytics, workflow automation, offline synchronization and AI assistance as separate approved modules. Each requires a business case, privacy/security review and measured operational need.

---

## 15. Release and public launch readiness checklist

### Product and business

- [ ] Pilot release scope, supported school/academy types and exclusions are published.
- [ ] Pricing/plan model, trials, renewals, overdue handling, cancellations and support boundaries are decided.
- [ ] Terms of service, privacy notice, acceptable use, data-processing terms and school onboarding agreement have been reviewed by qualified counsel.
- [ ] Legal review covers relevant Punjab education rules/notifications and other applicable laws before onboarding affected institutions.
- [ ] Data ownership, export, retention, deletion and school contract termination are documented.
- [ ] A product support route, response expectations and escalation owner exist.

### Architecture and security

- [ ] Tenant isolation verified through API, database, queue, cache, file, search and export tests.
- [ ] Privileged accounts protected with MFA policy and secure recovery.
- [ ] Production secrets are stored only in approved secret stores.
- [ ] Uploads are private, validated and scanned as designed.
- [ ] Critical/high security findings are resolved or formally block release.
- [ ] Logs and analytics exclude unnecessary child personal information and credentials.
- [ ] Independent penetration test is scheduled/completed according to launch risk.

### Data, reliability and operations

- [ ] Backup frequency, retention, RPO/RTO and named incident owner are documented.
- [ ] At least one full restoration drill has succeeded and the result is recorded.
- [ ] Migration rehearsal and sample institution import reconciliation have succeeded.
- [ ] Monitoring/alerts cover API health, database, queue backlog, failed jobs and provider errors.
- [ ] Release rollback/forward-fix runbook is available.
- [ ] Capacity and peak-load assumptions have been tested.
- [ ] Data export and tenant offboarding process has been rehearsed.

### Product quality

- [ ] P0 acceptance tests pass.
- [ ] End-to-end journeys A–F have been tested where applicable.
- [ ] Core mobile layouts, keyboard navigation and accessibility have been reviewed.
- [ ] English/Urdu encoding and key RTL layouts have been checked for the release scope.
- [ ] Empty states, validation errors, permission-denied states, loading states and failed-job states are handled.
- [ ] UAT sign-off exists from representative institution users.

---

## 16. Main risks and mitigation plan

| Risk | Impact | Mitigation / early action |
|---|---|---|
| Tenant isolation defect | Catastrophic privacy and business impact | Tenant context as a required design primitive; explicit ownership columns/constraints; cross-tenant tests in CI; independent review. |
| Scope too broad for first release | Delayed launch and inconsistent quality | Lock P0; defer hardware, advanced accounting, AI and offline features; add modules only after core usage is proven. |
| Unclear school vs academy model | Repeated schema changes and awkward UI | Workshop both institution types; implement explicit course/batch and grade/section concepts; test both early. |
| Financial calculations incorrect | Disputes, lost trust and financial exposure | Written fee rules, versioned fee structures, transaction-safe workflows, immutable history, edge-case test suite and accountant UAT. |
| Provider/hosting limits misunderstood | Unplanned costs or downtime | Proof of concept; test worker/API/deployment limits; monitor usage; plan provider exit/migration. |
| Data breach through exports/files/support | Exposure of child or financial records | Private storage, short-lived URLs, audited exports/support access, least privilege, incident response and security testing. |
| Incomplete migration | Operational disruption for schools | Dry-run, field mapping, error report, reconciliation sign-off and rollback/compensation plan. |
| Notification/payment provider failure | Missed parent communications or inconsistent payment state | Adapters, retries, idempotency, delivery/reconciliation dashboards and manual exception process. |
| Legal or regulatory change | Contract/compliance risk | Re-check authoritative rules and counsel advice before launch and at defined review intervals. |
| Overuse of AI or automation | Harmful or unaccountable actions | Keep AI outside critical decision paths; human approval for consequential actions; permission-aware outputs; logs and privacy review. |
| Vendor lock-in | Cost or migration difficulty | Keep domain logic behind typed server-only feature modules; use standard PostgreSQL, SQL migrations and documented integration contracts; regularly test data exports. |

---

## 17. Governance and change control

Each requirement must have a unique ID, description, priority, stakeholder owner, rationale, acceptance criteria, related design, implementation issue, test evidence and release version. Requirements and architecture decisions should be version-controlled in Git. Changes affecting tenant design, data ownership, payment logic, privacy, API compatibility or retention require an explicit impact review before merging.

Maintain an Architecture Decision Record (ADR) for major choices such as: tenant model, identity provider, hosting split, database/ORM, queue technology, payment gateway, data retention, Urdu/RTL implementation, and any future microservice extraction. Each ADR should state context, alternatives, decision, consequences and date.

A release may not silently drop a Must-have requirement. If scope changes, record the reason, risks, tests affected and the authorized approver. The product owner is accountable for functional priorities; engineering owns technical integrity; security/privacy lead (or assigned reviewer) owns threat/security review; QA owner owns the acceptance evidence; operations owner approves production readiness.

---

## 18. Open decisions to resolve before implementation

1. Exact launch persona and pilot cohort: how many institutions, campuses, students and concurrent users will be included?
2. School/academy onboarding policy: instant trial, manual approval, or verified invitation only during pilot?
3. Initial subscription/pricing approach: free pilot, manual invoicing or paid trial; what happens when a plan expires?
4. Which additional SSO/identity integrations, if any, are required beyond Supabase Auth for the first launch?
5. Which managed PostgreSQL provider meets backup/restore, region, connection pooling and cost needs?
6. What is the first supported outbound channel—email, SMS or an approved WhatsApp Business provider—and which provider accounts/terms are available?
7. Which payment provider (if any) will be enabled first for student fee payments, and what is the manual fallback/reconciliation process?
8. Is Urdu interface translation required in the pilot, or should the data model/layout be RTL-ready while full translation follows soon after?
9. What are the institution-specific fee, concession, late-fee, refund, academic-year and exam rules confirmed by pilot schools?
10. Which legal advisor will validate current privacy, education registration, tax/invoicing, payment and communications requirements?
11. What is the agreed hosting budget and how will costs be monitored as tenants grow?
12. Who owns production alerts, customer support, backup drills and incident response?

These questions should be answered during discovery rather than guessed inside code. Where a decision can safely remain open, document a reversible assumption and its review date.

---

## 19. Sample acceptance criteria templates

### ILM-SEC-001 — Tenant isolation

**Requirement:** The system shall deny access to organization-owned records outside the authenticated user's active and authorized membership scope.

**Acceptance criteria:**
- Direct requests for another tenant's records are denied.
- Tenant checks are applied to list, detail, create, update, delete/archive, search, export, upload/download and background-job paths.
- Automated regression tests cover at least two tenants with overlapping names and similar record IDs.
- Denials do not reveal sensitive record contents.
- Security-relevant denial events are logged without logging secrets or unnecessary personal details.

### ILM-FEE-012 — Idempotent billing run

**Requirement:** Repeating a billing operation for the same tenant, billing period and fee-structure version shall not create duplicate charges.

**Acceptance criteria:**
- Each run has a unique run ID and a defined idempotency scope.
- A retry returns the previously generated outcome or resumes safely.
- Each eligible student has no more than one charge per configured billing key unless policy explicitly permits multiple charges.
- Failed rows can be inspected and retried without duplicating successful rows.
- Reconciliation output records created, skipped, failed and retried counts.

### ILM-ATT-001 — Teacher attendance submission

**Requirement:** A teacher shall be able to record attendance for an assigned school class or academy session on a supported mobile browser.

**Acceptance criteria:**
- The API confirms the teacher's current assignment and requested session.
- All statuses are validated against configuration.
- Incomplete roster handling matches the approved policy and is visible to the teacher.
- Duplicate submissions do not create duplicate attendance rows.
- Successful submission shows confirmation and can be retrieved consistently.
- Corrections require a reason and preserve previous values.

### ILM-PLT-006 — Idempotent tenant provisioning

**Requirement:** Retrying tenant provisioning after a transient failure shall not create duplicate organization, campus, owner membership or subscription records.

**Acceptance criteria:**
- Provisioning has a unique request/correlation ID and explicit states.
- A retry resumes or reports the existing outcome.
- Partial failures are observable and can be retried/compensated safely.
- The operator console shows safe diagnostic information without exposing credentials.
- The created tenant passes baseline isolation and authentication smoke tests.

---

## 20. Reference material

The links below inform the proposed technology and security approach. Re-check them during implementation because products, versions, hosting limits and legal requirements can change.

1. Next.js App Router documentation: https://nextjs.org/docs/app
2. Next.js deployment guidance: https://nextjs.org/docs/app/getting-started/deploying
3. Next.js Playwright testing guide: https://nextjs.org/docs/app/guides/testing/playwright
4. Supabase SSR authentication guide: https://supabase.com/docs/guides/auth/server-side/nextjs
5. Supabase Row Level Security documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
6. PostgreSQL row security policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
7. Vercel Git deployments and preview workflows: https://vercel.com/docs/git
8. Vercel deployment environments: https://vercel.com/docs/deployments/environments
9. Vercel function limitations: https://vercel.com/docs/functions/limitations
10. OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
11. GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
12. Punjab Education Department — governing laws: https://schools.punjab.gov.pk/governing_laws
13. Punjab laws portal, including 2026 private educational institutions amendment listing: https://punjablaws.punjab.gov.pk/en/articles_by_category/30
14. Pakistan data protection legal status reference (secondary legal guide; counsel should verify against official publications): https://iclg.com/practice-areas/data-protection-laws-and-regulations/pakistan/

---

## Final recommendation

Use this document as the master product/architecture baseline. The next implementation artifact should be a **P0 requirements traceability matrix** containing every first-release requirement, role/permission, workflow, data entity, test case, owner, dependency and acceptance status. In parallel, produce the initial ERD, threat model, UI screen inventory and a working proof of concept for authentication plus tenant isolation. Only then begin the first vertical slice.

The first public launch should be defined as a successfully operated product—not merely a deployed URL. ILMOFAHM should go live only when a real institution can join, configure its workspace, import data, manage core day-to-day workflows, prove data isolation, recover from a backup, export its records and reach a support owner when something fails.
