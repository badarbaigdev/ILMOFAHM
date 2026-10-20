-- ILM-PLAT-001: Core tenant foundation schema
--
-- Tables: organizations, campuses, profiles, organization_memberships
-- Authorization roles live on memberships — never on profiles.
--
-- RLS is enabled without policies so the Data API denies by default until
-- ILM-PLAT-002 adds least-privilege grants and explicit allow/deny policies.
-- Do not treat this migration as complete tenant isolation.

-- gen_random_uuid() requires pgcrypto (normally present on Supabase local/hosted).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timestamptz 'now';
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on row modification.';

-- ---------------------------------------------------------------------------
-- organizations (tenant root)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  institution_type text not null,
  status text not null default 'trial',
  timezone text not null default 'Asia/Karachi',
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (length(trim(name)) > 0),
  constraint organizations_slug_format check (
    slug is null
    or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint organizations_institution_type_valid check (
    institution_type in ('school', 'academy', 'both')
  ),
  constraint organizations_status_valid check (
    status in (
      'application_pending',
      'trial',
      'active',
      'past_due',
      'suspended',
      'offboarding',
      'closed'
    )
  ),
  constraint organizations_slug_unique unique (slug)
);

comment on table public.organizations is
  'Tenant/customer account. Isolation boundary for all institution data.';
comment on column public.organizations.institution_type is
  'school, academy, or both — drives which academic models may be enabled.';
comment on column public.organizations.status is
  'SaaS tenant lifecycle status; not a substitute for membership authorization.';

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- campuses (belong to one organization)
-- ---------------------------------------------------------------------------

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  name text not null,
  code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_name_not_blank check (length(trim(name)) > 0),
  constraint campuses_code_not_blank check (
    code is null or length(trim(code)) > 0
  ),
  constraint campuses_status_valid check (status in ('active', 'archived')),
  constraint campuses_org_name_unique unique (organization_id, name),
  constraint campuses_org_code_unique unique (organization_id, code)
);

comment on table public.campuses is
  'Physical or logical campus within a single organization tenant.';

create index campuses_organization_id_idx
  on public.campuses (organization_id);

create trigger campuses_set_updated_at
before update on public.campuses
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users; not an authorization source)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key
    references auth.users (id)
    on delete cascade,
  full_name text,
  preferred_locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_not_blank check (
    full_name is null or length(trim(full_name)) > 0
  )
);

comment on table public.profiles is
  'Global user profile linked to auth.users. School access comes from organization_memberships, not this table.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_memberships (authorization source for tenant access)
-- ---------------------------------------------------------------------------

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  user_id uuid not null
    references public.profiles (id)
    on delete cascade,
  role text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_role_valid check (
    role in (
      'owner',
      'admin',
      'staff',
      'teacher',
      'finance',
      'guardian'
    )
  ),
  constraint organization_memberships_status_valid check (
    status in ('invited', 'active', 'suspended', 'revoked')
  ),
  constraint organization_memberships_org_user_unique unique (organization_id, user_id)
);

comment on table public.organization_memberships is
  'Links a user to an organization with an explicit role and membership status. This is the authorization source for tenant access.';
comment on column public.organization_memberships.role is
  'Organization-level role bundle. Campus/class scope is modelled separately when needed.';
comment on column public.organization_memberships.status is
  'invited/active/suspended/revoked — suspended and revoked must deny access on the next authorized request.';

create index organization_memberships_organization_id_idx
  on public.organization_memberships (organization_id);

create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create index organization_memberships_user_status_idx
  on public.organization_memberships (user_id, status);

create index organization_memberships_org_status_idx
  on public.organization_memberships (organization_id, status);

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock down Data API until ILM-PLAT-002 policies land
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.campuses enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.campuses from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;
