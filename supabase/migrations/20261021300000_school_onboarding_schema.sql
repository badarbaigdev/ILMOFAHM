-- Phase 2: School-based onboarding foundation (schema)
--
-- Adds the tenant root and registration/invitation tables required for the
-- school application → approval → provision → activate journey.
--
-- Reuses existing: profiles, platform_operators, audit_events, set_updated_at().
-- Legacy organizations / organization_* tables remain for the current /app path
-- until a dedicated cutover; new onboarding must not depend on them.
--
-- Naming note: legacy public.campuses is organization-scoped. School locations
-- live in public.school_campuses until that cutover renames/replaces campuses.

-- ---------------------------------------------------------------------------
-- schools (tenant root)
-- ---------------------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  status text not null default 'pending_setup',
  email text,
  phone text,
  address_line1 text,
  city text,
  region text,
  country_code text not null default 'PK',
  institution_type text not null default 'school',
  default_locale text not null default 'en',
  timezone text not null default 'Asia/Karachi',
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_name_not_blank check (length(trim(name)) > 0),
  constraint schools_slug_format check (
    slug is null
    or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint schools_slug_unique unique (slug),
  constraint schools_status_valid check (
    status in (
      'provisioning',
      'pending_setup',
      'active',
      'suspended',
      'closed'
    )
  ),
  constraint schools_institution_type_valid check (
    institution_type in ('school', 'academy', 'both')
  ),
  constraint schools_email_format check (
    email is null
    or (
      email = lower(trim(email))
      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  ),
  constraint schools_country_code_format check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint schools_locale_not_blank check (length(trim(default_locale)) > 0),
  constraint schools_timezone_not_blank check (length(trim(timezone)) > 0)
);

comment on table public.schools is
  'School tenant root. Isolation boundary for school-owned data in the new model.';
comment on column public.schools.status is
  'Tenant lifecycle: provisioning → pending_setup → active (or suspended/closed).';
comment on column public.schools.setup_completed_at is
  'Set when the owner finishes required school setup; null means setup incomplete.';

create index schools_status_idx on public.schools (status);
create index schools_created_at_idx on public.schools (created_at desc);

create trigger schools_set_updated_at
before update on public.schools
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- school_campuses (school locations)
-- ---------------------------------------------------------------------------

create table public.school_campuses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  address_line1 text,
  city text,
  status text not null default 'active',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_campuses_name_not_blank check (length(trim(name)) > 0),
  constraint school_campuses_status_valid check (
    status in ('active', 'archived')
  ),
  constraint school_campuses_school_name_unique unique (school_id, name)
);

comment on table public.school_campuses is
  'Campus/location belonging to a school. Replaces organization-scoped campuses for the school onboarding path. Planned cutover: become public.campuses.';

create index school_campuses_school_id_idx
  on public.school_campuses (school_id);

-- At most one default campus per school
create unique index school_campuses_one_default_per_school
  on public.school_campuses (school_id)
  where is_default;

create trigger school_campuses_set_updated_at
before update on public.school_campuses
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- school_memberships
-- ---------------------------------------------------------------------------

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  user_id uuid not null
    references public.profiles (id)
    on delete cascade,
  role text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_memberships_role_valid check (
    role in (
      'owner',
      'admin',
      'teacher',
      'accountant',
      'staff'
    )
  ),
  constraint school_memberships_status_valid check (
    status in ('invited', 'active', 'suspended', 'revoked')
  ),
  constraint school_memberships_school_user_unique unique (school_id, user_id)
);

comment on table public.school_memberships is
  'Links an authenticated user to a school with role and status. Authorization source for school access — not profiles.';

create index school_memberships_school_id_idx
  on public.school_memberships (school_id);

create index school_memberships_user_id_idx
  on public.school_memberships (user_id);

create index school_memberships_user_status_idx
  on public.school_memberships (user_id, status);

create index school_memberships_school_status_idx
  on public.school_memberships (school_id, status);

create trigger school_memberships_set_updated_at
before update on public.school_memberships
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- school_applications (public registration requests)
-- ---------------------------------------------------------------------------

create table public.school_applications (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  applicant_name text not null,
  applicant_email text not null,
  phone text,
  city text,
  region text,
  country_code text not null default 'PK',
  institution_type text not null default 'school',
  requested_plan_id text,
  message text,
  status text not null default 'pending',
  review_notes text,
  rejection_reason text,
  information_request text,
  reviewer_user_id uuid
    references public.profiles (id)
    on delete set null,
  provisioned_school_id uuid
    references public.schools (id)
    on delete set null,
  reviewed_at timestamptz,
  provisioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_applications_school_name_not_blank check (
    length(trim(school_name)) > 0
  ),
  constraint school_applications_applicant_name_not_blank check (
    length(trim(applicant_name)) > 0
  ),
  constraint school_applications_email_format check (
    applicant_email = lower(trim(applicant_email))
    and applicant_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint school_applications_institution_type_valid check (
    institution_type in ('school', 'academy', 'both')
  ),
  constraint school_applications_country_code_format check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint school_applications_status_valid check (
    status in (
      'pending',
      'under_review',
      'information_requested',
      'approved',
      'rejected'
    )
  ),
  constraint school_applications_provisioned_school_unique unique (
    provisioned_school_id
  )
);

comment on table public.school_applications is
  'Public school registration requests. Applicants cannot set status, reviewer, or provisioning fields.';
comment on column public.school_applications.provisioned_school_id is
  'Set once when approval provisions a school; uniqueness prevents duplicate schools per application.';

create index school_applications_status_created_at_idx
  on public.school_applications (status, created_at desc);

create index school_applications_applicant_email_idx
  on public.school_applications (applicant_email);

create index school_applications_reviewer_user_id_idx
  on public.school_applications (reviewer_user_id);

-- Soft duplicate guard: one open application per email + school name
create unique index school_applications_open_email_school_unique
  on public.school_applications (
    applicant_email,
    lower(trim(school_name))
  )
  where status in ('pending', 'under_review', 'information_requested');

create trigger school_applications_set_updated_at
before update on public.school_applications
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- school_invitations
-- ---------------------------------------------------------------------------

create table public.school_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  email text not null,
  role text not null,
  token_hash text not null,
  status text not null default 'pending',
  invited_by uuid
    references public.profiles (id)
    on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid
    references public.profiles (id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_invitations_email_format check (
    email = lower(trim(email))
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint school_invitations_role_valid check (
    role in (
      'owner',
      'admin',
      'teacher',
      'accountant',
      'staff'
    )
  ),
  constraint school_invitations_status_valid check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  ),
  constraint school_invitations_token_hash_not_blank check (
    length(trim(token_hash)) > 0
  ),
  constraint school_invitations_token_hash_unique unique (token_hash),
  constraint school_invitations_expires_after_created check (
    expires_at > created_at
  )
);

comment on table public.school_invitations is
  'School user invitations. Store only a hash of the secret token — never plaintext.';

create unique index school_invitations_pending_email_unique
  on public.school_invitations (school_id, email)
  where status = 'pending';

create index school_invitations_school_id_idx
  on public.school_invitations (school_id);

create index school_invitations_email_idx
  on public.school_invitations (email);

create index school_invitations_status_expires_at_idx
  on public.school_invitations (status, expires_at);

create trigger school_invitations_set_updated_at
before update on public.school_invitations
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_events: optional school scope for the new model
-- ---------------------------------------------------------------------------

alter table public.audit_events
  add column if not exists school_id uuid
    references public.schools (id)
    on delete restrict;

comment on column public.audit_events.school_id is
  'School tenant scope when the audited action targets school onboarding or school operations.';

create index if not exists audit_events_school_id_created_at_idx
  on public.audit_events (school_id, created_at desc);

-- ---------------------------------------------------------------------------
-- profiles comment update (authorization still not on profiles)
-- ---------------------------------------------------------------------------

comment on table public.profiles is
  'Global user profile linked to auth.users. School access comes from school_memberships (new model) or organization_memberships (legacy) — never from this table alone.';
