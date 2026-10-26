# ILMOFAHM — Implementation Status

**Last updated:** 2026-10-22

Track progress across Cursor sessions. Do not mark unfinished work as complete.

## Current phase

**Phase 11 teachers + student fees live.** `/school/teachers` and `/school/fees` use real schema/RPCs (not sample). Next: localization, exams/results, or fee concessions/refunds.

## Phase checklist

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Repository baseline | **Complete** | Inspected; checks documented |
| 1 Public website (static) | **Complete** | All public routes; forms validate without claiming delivery |
| 2 School-based schema | **Complete** | School onboarding tables + RLS; legacy org tables retained for `/app` |
| 3 Platform admin auth | **Complete** | Controlled bootstrap, revocation, middleware + unauthorized page |
| 4 Public school registration | **Complete** | `/register-school` → pending `school_applications` |
| 5 Application review/approval | **Complete** | `/platform/requests`; review + approve RPCs; audit |
| 6 School provisioning | **Complete** | Dedicated provision RPC; heal/retry; `/platform/schools` |
| 7 Owner invitation/activation | **Complete** | `accept_school_invitation`; `/auth/accept-school-invite`; `/school` landing |
| 8 School setup + login | **Complete** | `/school/setup` + `/school/settings`; `complete_school_setup` → `active` |
| 9 Manual subscriptions | **Complete** | Plans/subscriptions/payments; provision creates trial; no gateways |
| 10 School roles | **Complete** | Invite/revoke/status/role RPCs; `/school/members`; permission matrix |
| 11 Academic modules | **In progress** | Structure + students + guardians + attendance + CSV import + teachers + fees |
| 12 Localization | Prepared | Marketing copy in structured modules |
| 13 Security/testing hardening | Ongoing per module | |
| 14 Production deployment | Not started | |

## Phase 0 findings (summary)

- **App:** Next.js 15.5.28, React 19.1, Tailwind 4, Supabase SSR clients
- **DB:** Local Supabase; org-based schema; clean reset via `supabase db reset` (local only)
- **Reusable:** Auth, AppShell, platform operators, audit helpers, brand tokens, CI

### Baseline checks (Phase 0)

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test` | Pass (95 → later 100 with marketing validators) |
| `npm run build` | Pass |
| `npm run format:check` | Had pre-existing drift; Prettier applied during Phase 1 |

## Phase 1 — What was implemented

Presentable public marketing site with static content:

| Route | Purpose |
| --- | --- |
| `/` | Home — brand hero, features, benefits, pricing preview, FAQ, CTAs |
| `/features` | Capabilities with available / in progress / planned labels |
| `/pricing` | Example plans from central `pricing.ts` (contact-for-pricing) |
| `/demo` | Demo request form (client validation only) |
| `/register-school` | Registration entry form (client validation only) |
| `/contact` | Contact form (client validation only) |
| `/privacy`, `/terms` | Illustrative legal outlines |

### Files changed (high level)

- **Docs:** `docs/implementation-roadmap.md`, `architecture.md`, `database-schema.md`, `security-model.md`, `implementation-status.md`
- **Marketing feature:** `apps/web/src/features/marketing/*`
- **UI:** `apps/web/src/components/marketing/*`
- **Routes:** `apps/web/src/app/(marketing)/*`
- **Layouts:** root layout fonts; AppShell only on `/app`, `/platform`, `/auth`
- **Shell:** signed-out AppShell links to public pages

### Database migrations

None added or applied in Phase 0/1 (by design).

### Checks run (Phase 1)

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass (after clearing stale `.next` types) |
| `npm run test` | Pass — **100** tests, 0 fail |
| `npm run build` | Pass — all public routes listed |
| Browser | Home, features, register-school verified; form invalid + valid paths honest |

### Known limitations

- Demo / contact / register forms do **not** persist or email — clearly labelled demo-stage
- No invented customer stats or live pricing claims

## Phase 2 — What was implemented

School onboarding foundation in versioned migrations (parallel to legacy org model):

| Object | Notes |
| --- | --- |
| `schools` | Tenant root with lifecycle status |
| `school_campuses` | School locations (legacy `campuses` stays org-scoped until cutover) |
| `school_memberships` | owner/admin/teacher/accountant/staff |
| `school_applications` | Public pending inserts; operator review fields protected |
| `school_invitations` | token_hash only |
| Shared | Reused `profiles`, `platform_operators`; `audit_events.school_id` added |

### Migrations added / applied (local)

- `20261021300000_school_onboarding_schema.sql`
- `20261021301000_school_onboarding_rls.sql`
- Applied via `supabase db reset` on local Docker (not production)

### Checks run (Phase 2)

| Check | Result |
| --- | --- |
| `supabase db reset` | Pass — all migrations including Phase 2 |
| `supabase test db` | Pass — **181** tests (includes 25 new school onboarding cases) |

### Known limitations

- Legacy organization schema still present for existing `/app` code
- School campuses table is `school_campuses` until org cutover
- No provisioning RPC yet (Phase 6); no public registration server action yet (Phase 4)
- Application UI still talks to organization tables for the workspace

## Phase 3 — What was implemented

Hardened platform operator authentication:

| Piece | Detail |
| --- | --- |
| Bootstrap | `bootstrap_first_platform_operator()` + secret-gated `/platform/bootstrap` (`PLATFORM_BOOTSTRAP_SECRET`) — DB disabled once any active operator exists; prefer `scripts/bootstrap-platform-operator.sh` |
| Script | `scripts/bootstrap-platform-operator.sh` calls the same DB function |
| Dev fixtures | `supabase/fixtures/dev_platform.sql` via `./scripts/seed-dev-fixtures.sh` (local) or `--linked` (develop); also loaded by `supabase db reset` / `seed.sql` |
| Owner activation | Approval link → one-click `activate_school_invitation` (service role) + session; password optional later at `/auth/update-password` |
| Revocation | `set_platform_operator_status()` + `/platform/operators` (cannot remove last active) |
| Guards | Middleware requires active operator for `/platform/*` (except bootstrap/unauthorized) |
| Unauthorized | `/platform/unauthorized` for signed-in non-operators / revoked |
| Audit | Bootstrap and status changes write `audit_events` |
| Permissions | Expanded platform permission constants for upcoming application/school work |

### Migrations added / applied (local)

- `20261021310000_platform_operator_bootstrap_and_status.sql`
- Applied via `supabase db reset` (local only)

### Checks run (Phase 3)

| Check | Result |
| --- | --- |
| `supabase db reset` | Pass |
| `supabase test db` | Pass — **195** tests (14 new bootstrap/status cases) |
| `npm run lint` / `typecheck` / `test` / `build` | Pass |

### Known limitations

- Operator invite-by-email UI not built (status manage only for existing rows)
- Platform dashboard still org-centric until Phase 5 school application queue
- Recovery of a fully locked-out operator set requires privileged DB access (by design)

## Phase 4 — What was implemented

Public school registration persists pending applications:

| Piece | Detail |
| --- | --- |
| Server action | `submitSchoolApplicationAction` — validates/normalizes; never accepts approval fields |
| Abuse controls | Honeypot field + in-process rate limit (IP + email) |
| Duplicates | Unique open-application index → clear user message |
| UI | `/register-school` submits for real; success states do not claim an active school |
| Audit | Trigger writes sanitized `school.application.submitted` events (no email/message) |

### Migrations added / applied (local)

- `20261021320000_school_application_submit_audit.sql`

### Checks run (Phase 4)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **200** tests |
| lint / typecheck / unit / build | Pass — **107** unit tests |
| Browser | Submitted application; success message shown; DB row `pending` confirmed |

### Known limitations

- Rate limit is single-process (fine for one Next instance; not distributed)
- Demo/contact forms still demo-stage only


## Phase 5 — What was implemented

Platform operators review and approve school applications through controlled RPCs:

| Piece | Detail |
| --- | --- |
| Routes | `/platform/requests` (filterable list), `/platform/requests/[id]` (detail + actions) |
| Review RPC | `review_school_application` — validated transitions; rejection / info-request require messages |
| Approve RPC | `approve_school_application` — provisions school + default campus + owner invitation; idempotent |
| Authz | Direct `UPDATE` on `school_applications` revoked; non-operators denied on RPCs |
| Audit | `school.application.reviewed`, `school.application.approved`, `school.provisioned` |
| UI | Status filters, review form, confirm-before-approve, one-time invitation token display |

### Migrations added / applied (local)

- `20261021330000_school_application_review.sql`

### Checks run (Phase 5)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **217** tests |
| lint / typecheck / unit / build | Pass — **111** unit tests; `/platform/requests` routes in build |

### Known limitations

- Owner invitation email / accept flow not built (Phase 7)
- Invitation token shown once in operator UI until email delivery exists
- School setup / portal login still org-centric (Phase 8)

## Phase 6 — What was implemented

Dedicated idempotent school provisioning with operator visibility:

| Piece | Detail |
| --- | --- |
| RPC | `provision_school_from_application` — advisory lock, create or heal campus/invite |
| Approve | `approve_school_application` validates transition then calls provisioner |
| Recovery | Approved-without-school and incomplete school/campus/invite can be repaired |
| UI | `/platform/schools` list; request detail shows provisioning snapshot; provision action |
| Guarantee | Unique `provisioned_school_id` + locks → at most one school per application |

### Migrations added / applied (local)

- `20261021340000_school_provisioning.sql`

### Checks run (Phase 6)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **229** tests |
| lint / typecheck / unit / build | Pass — **111** unit tests; `/platform/schools` in build |

### Known limitations

- Owner invite accept/activate UI still Phase 7
- No email delivery of invitation tokens yet
- School portal setup still Phase 8

## Phase 7 — What was implemented

Owner invitation acceptance activates school membership securely:

| Piece | Detail |
| --- | --- |
| RPC | `accept_school_invitation` — email match, single-use, correct school only |
| Auth paths | `/auth/accept-school-invite`; sign-in/sign-up preserve invite `next` |
| Portal | Minimal `/school` landing for active members (setup is Phase 8) |
| Operator UX | Approve/provision shows one-time accept link |
| Middleware | `/school` requires session; invite `next` preserved after auth |

### Migrations added / applied (local)

- `20261021350000_school_invitation_accept.sql`

### Checks run (Phase 7)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **240** tests |
| lint / typecheck / unit / build | Pass — **111** unit tests; `/auth/accept-school-invite` + `/school` in build |

### Known limitations

- No email delivery of invitations yet (manual link share)
- Full school setup checklist is Phase 8
- School nav/shell is minimal

## Phase 8 — What was implemented

School owners/admins complete setup after invitation accept, then land on an active school portal:

| Piece | Detail |
| --- | --- |
| Schema | `schools` branding/working_days; `school_campuses` contact/code; `school_holidays` |
| Lifecycle | Trigger protects `status` / `setup_completed_at` / slug; writes via RPCs only |
| RPCs | profile, branding, locale, holidays, campuses, `complete_school_setup` |
| Routes | `/school/setup` (wizard), `/school/settings`, `/school` dashboard |
| Authz | Manager-only mutations; invite accept → setup; pending_setup managers redirect to setup |

### Migrations added / applied (local)

- `20261021360000_school_setup.sql`

### Checks run (Phase 8)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **256** tests |
| lint / typecheck / unit / build | Pass — **113** unit tests; `/school/setup` + `/school/settings` in build |

### Known limitations

- Academic structure still Phase 11 (not part of this setup checklist)
- Staff invites / role matrix expansion still Phase 10
- No logo file upload (https URL only)

## Phase 9 — What was implemented

Platform operators manage SaaS plans and manual subscriptions/payments:

| Piece | Detail |
| --- | --- |
| Schema | `subscription_plans`, `school_subscriptions`, `subscription_payments` |
| RPCs | assign/status, record/void payment, `ensure_school_trial_subscription` |
| Provision | Creates idempotent trial subscription (requested plan or `starter`) |
| UI | `/platform/plans`, `/platform/subscriptions`, detail + dashboard attention |
| Security | Operator-only writes; payments SELECT operator-only; audited |

### Migrations added / applied (local)

- `20261021370000_manual_subscriptions.sql`
- `20261021371000_provision_trial_subscription.sql`

### Checks run (Phase 9)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **270** tests |
| lint / typecheck / unit / build | Pass — **117** unit tests; `/platform/plans` + `/platform/subscriptions` in build |

### Known limitations

- No payment gateways (by design)
- Marketing `/pricing` still uses `pricing.ts` file (DB catalog for operators)
- School-owner plan self-service UI deferred

## Phase 10 — What was implemented

School owners/admins manage staff via invitations and membership status:

| Piece | Detail |
| --- | --- |
| RPCs | `create_school_invitation`, `revoke_school_invitation`, `set_school_membership_status`, `set_school_membership_role` |
| Matrix | `features/schools/permissions.ts` — server-side role→permission checks |
| UI | `/school/members` invite/list/status/role; nav link |
| Rules | No owner via staff invite; self lockout blocked; last-owner protected |

### Migrations added / applied (local)

- `20261021400000_school_staff_membership.sql`

### Checks run (Phase 10)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **283** tests |
| lint / typecheck / unit / build | Pass — **122** unit tests; `/school/members` in build |

### Known limitations

- No email delivery of invites (manual link share)
- No campus/class-scoped permissions yet (Phase 11+)
- Guardians/parents not in school role set

## Phase 11 — School academic structure (slice)

School-tenant academic years/terms and grades/sections/subjects (parallel to org tables; no mixed FKs).

| Area | Delivered |
| --- | --- |
| Schema | `school_academic_years`, `school_academic_terms`, `school_grades`, `school_sections`, `school_subjects` + RLS select for members |
| RPCs | create/update year, create term, create grade/section/subject, archive grade; manager-only writes; academy blocked from grades/subjects |
| App | `/school/academic`; `academic.read` / `academic.manage` on school permission matrix |
| Tests | `school_academic_structure.test.sql` + permission unit coverage |

### Migrations added / applied (local)

- `20261021410000_school_academic_structure.sql`

### Checks run (Phase 11 slice)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **302** tests (was 283) |
| lint / typecheck / unit / build | Pass — **123** unit tests; `/school/academic` in build |

### Out of scope (academic slice)

- Attendance, fees, results, student import, academy courses/cohorts, timetables, payment gateways, email invite delivery

## Phase 11 — School students & enrolments (slice)

Manual student records and academic-year enrolments on school tenancy.

| Area | Delivered |
| --- | --- |
| Schema | `school_students`, `school_enrolments` + RLS select for members |
| RPCs | `create_school_student`, `create_school_enrolment`, `withdraw_school_enrolment` (managers) |
| App | `/school/students`; `student.read` / `student.manage` |
| Tests | `school_students_enrolments.test.sql` + validators |

### Migrations added / applied (local)

- `20261021430000_school_students_enrolments.sql`

### Checks run (students slice)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **320** tests |
| lint / typecheck / unit / build | Pass — **128** unit tests; `/school/students` in build |

### Out of scope (students slice)

- Bulk import, duplicate merge, medical/safeguarding fields, transfers UI, attendance/fees

## Phase 11 — School guardians (slice)

Guardian contact records and student relationship links (no parent portal Auth yet).

| Area | Delivered |
| --- | --- |
| Schema | `school_guardians`, `school_student_guardians` + RLS |
| RPCs | create guardian, link/unlink (managers; same-school enforced) |
| App | `/school/guardians`; uses `student.read` / `student.manage` |
| Tests | `school_guardians.test.sql` + validators |

### Migrations added / applied (local)

- `20261021440000_school_guardians.sql`

### Checks run (guardians slice)

| Check | Result |
| --- | --- |
| `supabase test db` | Pass — **329** tests (`school_guardians` 9/9) |
| unit / build | Pass — **132** unit tests; `/school/guardians` in build |

### Out of scope this slice

- Parent Auth invites, portal access, custody disputes, email delivery

## Phase 11 — School attendance (slice)

Daily section attendance with draft → submit and manager corrections.

| Area | Delivered |
| --- | --- |
| Schema | `school_attendance_sessions`, `school_attendance_marks` + RLS |
| RPCs | open (idempotent), save draft marks, submit, correct (managers + reason) |
| App | `/school/attendance`; `attendance.read` / `attendance.manage` (teachers can manage) |
| Tests | `school_attendance.test.sql` + validators |

### Migrations added / applied (local)

- `20261021450000_school_attendance.sql`

### Checks run (attendance slice)

| Check | Result |
| --- | --- |
| `supabase db reset` + `supabase test db` | Pass — **341** tests (`school_attendance` 12/12) |
| unit / build | Pass — **139** unit tests; `/school/attendance` in build |

### Out of scope this slice

- Period-wise attendance, teacher↔section assignment, parent notifications, offline sync, staff leave

## Phase 11 — School student CSV import (slice)

Dry-run → commit bulk student create (optional enrolment by academic year / grade / section name). Excel via Save As CSV.

| Area | Delivered |
| --- | --- |
| Schema | `school_student_import_batches`, `school_student_import_rows` + RLS |
| RPCs | `create_school_student_import_dry_run`, `commit_school_student_import_batch` (managers; ≤500 rows) |
| App | `/school/students` bulk import panel; template + error CSV download |
| Tests | `school_student_import.test.sql` + CSV parser unit tests |

### Migrations added

- `20261021460000_school_student_import.sql`

### Checks run (import slice)

| Check | Result |
| --- | --- |
| `school_student_import.test.sql` | Pass (10/10) when suite runs clean |
| unit / build | Pass — **143** unit tests; `/school/students` includes import UI |

### Out of scope this slice

- Native `.xlsx` binary parse, background job queue, guardian columns, auto-merge duplicates, field mapping UI

## Phase 11 — School teachers (slice)

Teacher HR directory records (separate from login memberships).

| Area | Delivered |
| --- | --- |
| Schema | `school_teachers` + RLS select for members |
| RPCs | `create_school_teacher`, `archive_school_teacher` (managers) |
| App | `/school/teachers`; `teacher.read` / `teacher.manage` |
| Tests | `school_teachers.test.sql` + validators |

### Migrations added

- `20261021470000_school_teachers.sql`

### Checks run (teachers slice)

| Check | Result |
| --- | --- |
| unit / typecheck / build | Pass — **165** unit tests; `/school/teachers` in build |
| `supabase test db` teachers | Pass — **8/8** |

### Out of scope this slice

- Subject/section assignments, timetable conflicts, payroll, auto-link to Auth membership

## Phase 11 — School student fees (slice)

Fee heads, student charges, and append-only manual payments (not SaaS subscriptions).

| Area | Delivered |
| --- | --- |
| Schema | `school_fee_heads`, `school_fee_charges`, `school_fee_payments` + RLS |
| RPCs | `create_school_fee_head`, `create_school_fee_charge`, `record_school_fee_payment` (owner/admin/accountant; idempotency key) |
| App | `/school/fees`; `fee.read` / `fee.manage` (accountant manages) |
| Tests | `school_fees.test.sql` + validators + summary unit tests |

### Migrations added

- `20261021480000_school_fees.sql`
- `20261021480100_school_fee_payment_idempotency_order.sql`

### Checks run (fees slice)

| Check | Result |
| --- | --- |
| unit / typecheck / build | Pass — **165** unit tests; `/school/fees` in build |
| `supabase test db` fees | Pass — **12/12** |

### Out of scope this slice

- Billing runs, concessions/refunds, payment gateways, parent portal balances, multi-currency, challan PDF

## Next milestone

**Phase 12 localization** — or exams/results / fee concessions.

### Develop DB note

Push/apply `20261021470000`–`20261021480100` to the develop project before using live teachers/fees against that database.
