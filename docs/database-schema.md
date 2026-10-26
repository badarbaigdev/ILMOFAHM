# ILMOFAHM — Database Schema

**Status:** Phase 11 school teachers + student fees added  
**Last updated:** 2026-10-22  
**Source of truth:** `supabase/migrations/*.sql`

## Clean-database strategy

1. **Migrations are authoritative.** Initialize any environment with `supabase db reset` (local) or ordered migration apply (hosted). Never treat dashboard-only edits as durable schema.
2. **Local development is disposable.** `./scripts/supabase-local.sh reset` (or `supabase db reset`) destroys local data and re-applies migrations + `seed.sql`. Safe for local Docker only.
3. **Do not reset production or shared remote DBs** without explicit confirmation that the target is a disposable development project.
4. **School onboarding path (Phase 2+)** uses the school-based tables below. It does **not** require `organizations` / `organization_memberships` for new registration → login work.
5. **Fixtures only.** `seed.sql` and tests use synthetic data — never real student/guardian records.

### Reproduce a clean local database

```bash
# From repository root
docker version && supabase --version
./scripts/supabase-local.sh start   # or: supabase start
./scripts/supabase-local.sh reset   # or: supabase db reset
supabase status -o env              # copy URL + keys into apps/web/.env.local
supabase test db                    # RLS / constraint allow-deny suite
```

## Dual-model note (intentional, temporary)

| Model | Tables | Used by |
| --- | --- | --- |
| **School (target)** | `schools`, `school_campuses`, `school_memberships`, `school_applications`, `school_invitations`, `school_academic_*`, `school_grades` / `sections` / `subjects` | Phases 4–11 |
| **Organization (legacy)** | `organizations`, `campuses`, `organization_memberships`, … | Existing `/app` workspace until cutover |
| **Shared** | `profiles`, `platform_operators`, `audit_events` | Both |

`public.campuses` remains organization-scoped. School locations are `school_campuses` until a dedicated cutover renames/replaces the legacy campus table. Do not mix FKs across models.

## School onboarding tables (Phase 2)

| Table | Purpose |
| --- | --- |
| `schools` | School tenant root (`provisioning` → `pending_setup` → `active` / `suspended` / `closed`) |
| `school_campuses` | Locations belonging to a school; at most one `is_default` per school; contact/code + brand overrides |
| `school_holidays` | Named holiday dates per school (RPC writes only) |
| `subscription_plans` | ILMOFAHM SaaS plan catalog (`starter` / `growth` / `institution`) |
| `school_subscriptions` | Current/historical SaaS subscriptions per school (not student fees) |
| `subscription_payments` | Manual SaaS payment records (no payment gateway) |
| `profiles` | Auth-linked profile (no passwords; not an authorization source) |
| `school_memberships` | User ↔ school role (`owner`, `admin`, `teacher`, `accountant`, `staff`) + status |
| `school_applications` | Public registration requests; privileged review/provision fields operator-only |
| `school_invitations` | Invites with **token_hash only** (never plaintext secrets) |
| `school_academic_years` | School-scoped academic years/sessions (RPC writes) |
| `school_academic_terms` | Optional terms within a school academic year |
| `school_grades` | Grades for school/mixed institutions |
| `school_sections` | Sections within a school grade |
| `school_subjects` | Subjects for school/mixed institutions |
| `school_students` | Student records per school (manual entry) |
| `school_enrolments` | Student ↔ year/grade/section placements |
| `school_guardians` | Guardian/contact records per school |
| `school_student_guardians` | Student ↔ guardian relationship links |
| `school_attendance_sessions` | Daily section attendance sessions (draft/submitted) |
| `school_attendance_marks` | Per-student marks within a session |
| `school_student_import_batches` | CSV import dry-run / commit batches |
| `school_student_import_rows` | Per-row validation and import outcome |
| `school_teachers` | Teacher HR directory (optional `user_id` login link later) |
| `school_fee_heads` | Named student fee types with default amounts |
| `school_fee_charges` | Student fee obligations / challans |
| `school_fee_payments` | Append-only manual fee receipts (idempotent) |
| `platform_operators` | Platform admin authorization (no self-service writes) |
| `audit_events` | Append-only audit; optional `school_id` for school-scoped events |

### Security highlights

- RLS + least-privilege grants on all school tables; `FORCE ROW LEVEL SECURITY`.
- Anon may **INSERT** pending `school_applications` only; no SELECT.
- Trigger strips privileged application columns for non-operators on INSERT.
- Authenticated **UPDATE** on `school_applications` revoked — operators mutate via RPCs only.
- Unique open-application guard on `(applicant_email, lower(school_name))`.
- `provisioned_school_id` unique → at most one school per application.
- `school_id` reassignment blocked on campuses, memberships, invitations.
- Helpers: `is_active_school_member(school_id)`, `is_school_manager(school_id)`.
- Review RPCs: `review_school_application`, `approve_school_application`.
- Provisioning: `provision_school_from_application` (idempotent create/heal; at most one school per application).
- Activation: `accept_school_invitation` (token hash match; email must match; single-use).
- Setup: `update_school_profile` / `update_school_branding` / `update_school_locale_settings` / campus + holiday RPCs / `complete_school_setup` (`pending_setup` → `active`).
- Direct `UPDATE` on `schools` and campus writes revoked for authenticated — managers use RPCs.
- Staff: `create_school_invitation` / `revoke_school_invitation` / `set_school_membership_status` / `set_school_membership_role` (owner invite remains provisioning-only).
- Academic: `create_school_academic_year` / `update_school_academic_year` / `create_school_academic_term` / `create_school_grade` / `create_school_section` / `create_school_subject` / `archive_school_grade` (managers only; grades/subjects require school or mixed institution).
- Students: `create_school_student` / `create_school_enrolment` / `withdraw_school_enrolment` (managers; one active enrolment per student per year).
- Guardians: `create_school_guardian` / `link_school_student_guardian` / `unlink_school_student_guardian` (managers; same-school only).
- Attendance: `open_school_attendance_session` / `save_school_attendance_marks` / `submit_school_attendance_session` (owner/admin/teacher); `correct_school_attendance_mark` (managers + reason).
- Student import: `create_school_student_import_dry_run` / `commit_school_student_import_batch` (managers; max 500 rows; optional enrolment by year/grade/section name).
- Teachers: `create_school_teacher` / `archive_school_teacher` (managers).
- Fees: `is_school_fee_manager`; `create_school_fee_head` / `create_school_fee_charge` / `record_school_fee_payment` (owner/admin/accountant; payments append-only + idempotency key).
- Owner activation: `reissue_school_owner_invitation` (platform operators; mint shareable link).

## Legacy organization schema

Still present from earlier milestones (profile, branding, academic structure, org invites, org provisioning RPCs). Frozen for current `/app` behavior. Not required for the new school registration journey.

## Migration inventory (school onboarding)

| File | Contents |
| --- | --- |
| `20261021300000_school_onboarding_schema.sql` | School tables + `audit_events.school_id` |
| `20261021301000_school_onboarding_rls.sql` | Helpers, grants, RLS, application privilege protection |
| `20261021320000_school_application_submit_audit.sql` | Submit audit trigger |
| `20261021330000_school_application_review.sql` | Transition helper + review/approve RPCs |
| `20261021340000_school_provisioning.sql` | Dedicated provision RPC + approve refactor |
| `20261021350000_school_invitation_accept.sql` | Accept invitation → school_memberships |
| `20261021360000_school_setup.sql` | Setup columns, holidays, lifecycle guard, setup RPCs |
| `20261021370000_manual_subscriptions.sql` | Plans, subscriptions, manual payments + RPCs |
| `20261021371000_provision_trial_subscription.sql` | Provision attaches idempotent trial subscription |
| `20261021400000_school_staff_membership.sql` | Staff invite/revoke + membership status/role RPCs |
| `20261021410000_school_academic_structure.sql` | School years/terms + grades/sections/subjects + RPCs |
| `20261021420000_reissue_school_owner_invitation.sql` | Reissue owner activation token |
| `20261021430000_school_students_enrolments.sql` | Students + year enrolments + RPCs |
| `20261021440000_school_guardians.sql` | Guardians + student links + RPCs |
| `20261021450000_school_attendance.sql` | Daily section attendance + RPCs |
| `20261021460000_school_student_import.sql` | Student CSV import dry-run + commit |
| `20261021470000_school_teachers.sql` | Teacher HR directory + RPCs |
| `20261021480000_school_fees.sql` | Fee heads/charges/payments + fee-manager helper |
| `20261021480100_school_fee_payment_idempotency_order.sql` | Idempotent payment replay before paid guards |

Tests: … + `school_students_enrolments`, `school_guardians`, `school_attendance`, `school_student_import`, `school_teachers`, `school_fees`
