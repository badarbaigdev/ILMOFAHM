-- Platform operator (Superadmin) console foundation
--
-- Platform roles are NOT organization memberships. Operators manage tenants
-- system-wide without automatic access to student/academic tenant rows.

-- ---------------------------------------------------------------------------
-- platform_operators
-- ---------------------------------------------------------------------------

create table public.platform_operators (
  user_id uuid primary key
    references public.profiles (id)
    on delete cascade,
  role text not null default 'operator',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_operators_role_valid check (role in ('operator')),
  constraint platform_operators_status_valid check (
    status in ('active', 'suspended', 'revoked')
  )
);

comment on table public.platform_operators is
  'SaaS platform operators (Superadmin). Separate from organization_memberships.';

create trigger platform_operators_set_updated_at
before update on public.platform_operators
for each row
execute function public.set_updated_at();

alter table public.platform_operators enable row level security;
alter table public.platform_operators force row level security;

revoke all on table public.platform_operators from anon, authenticated;
grant select on table public.platform_operators to authenticated;

-- ---------------------------------------------------------------------------
-- is_platform_operator()
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_operators as po
    where po.user_id = (select auth.uid())
      and po.status = 'active'
  );
$$;

comment on function public.is_platform_operator() is
  'True when the current authenticated user is an active platform operator.';

revoke all on function public.is_platform_operator() from public;
grant execute on function public.is_platform_operator() to authenticated;

create policy platform_operators_select_self_or_operator
on public.platform_operators
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_operator()
);

-- Operators may list all organizations (read-only). Tenant mutations still
-- go through manager RPCs / membership RLS for academic data.
create policy organizations_select_platform_operator
on public.organizations
for select
to authenticated
using (public.is_platform_operator());

-- ---------------------------------------------------------------------------
-- platform_list_organizations
-- ---------------------------------------------------------------------------

create or replace function public.platform_list_organizations()
returns table (
  organization_id uuid,
  name text,
  slug text,
  institution_type text,
  status text,
  created_at timestamptz,
  owner_user_id uuid,
  owner_full_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  return query
  select
    o.id,
    o.name,
    o.slug,
    o.institution_type,
    o.status,
    o.created_at,
    m.user_id,
    p.full_name
  from public.organizations as o
  left join lateral (
    select om.user_id
    from public.organization_memberships as om
    where om.organization_id = o.id
      and om.role = 'owner'
      and om.status = 'active'
    order by om.created_at asc
    limit 1
  ) as m on true
  left join public.profiles as p on p.id = m.user_id
  order by o.created_at desc;
end;
$$;

revoke all on function public.platform_list_organizations() from public, anon;
grant execute on function public.platform_list_organizations() to authenticated;

-- ---------------------------------------------------------------------------
-- platform_create_organization
-- Assigns an existing auth user as owner. Auth user creation is done in the
-- Next.js server action with the service role before calling this RPC.
-- ---------------------------------------------------------------------------

create or replace function public.platform_create_organization(
  p_name text,
  p_institution_type text,
  p_owner_user_id uuid,
  p_slug text default null,
  p_timezone text default 'Asia/Karachi',
  p_locale text default 'en',
  p_campus_name text default 'Main campus'
)
returns table (
  organization_id uuid,
  campus_id uuid,
  membership_id uuid,
  name text,
  slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_slug text := nullif(trim(p_slug), '');
  v_campus_name text := nullif(trim(p_campus_name), '');
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'Asia/Karachi');
  v_locale text := coalesce(nullif(trim(p_locale), ''), 'en');
  v_organization_id uuid;
  v_campus_id uuid;
  v_membership_id uuid;
  v_base_slug text;
  v_attempt integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Organization name is required' using errcode = '22023';
  end if;
  if p_institution_type is null
     or p_institution_type not in ('school', 'academy', 'both') then
    raise exception 'Invalid institution_type' using errcode = '22023';
  end if;
  if p_owner_user_id is null then
    raise exception 'Owner user is required' using errcode = '22023';
  end if;
  if v_campus_name is null then
    raise exception 'Campus name is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles as p where p.id = p_owner_user_id
  ) then
    raise exception 'Owner profile not found' using errcode = 'P0002';
  end if;

  if v_slug is null then
    v_base_slug := lower(regexp_replace(trim(v_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := trim(both '-' from v_base_slug);
    if v_base_slug = '' then
      v_base_slug := 'organization';
    end if;
    v_base_slug := left(v_base_slug, 40);
    v_slug := v_base_slug;
    while exists (
      select 1 from public.organizations as o where o.slug = v_slug
    ) loop
      v_attempt := v_attempt + 1;
      v_slug := left(v_base_slug, 36) || '-' || v_attempt::text;
      if v_attempt > 50 then
        raise exception 'Could not allocate a unique slug'
          using errcode = '23505';
      end if;
    end loop;
  else
    if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'Invalid organization slug' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.organizations as o where o.slug = v_slug
    ) then
      raise exception 'Organization slug already exists'
        using errcode = '23505';
    end if;
  end if;

  insert into public.organizations (
    name,
    slug,
    institution_type,
    status,
    timezone,
    locale
  )
  values (
    v_name,
    v_slug,
    p_institution_type,
    'trial',
    v_timezone,
    v_locale
  )
  returning id into v_organization_id;

  insert into public.campuses (
    organization_id,
    name,
    code,
    status
  )
  values (
    v_organization_id,
    v_campus_name,
    'MAIN',
    'active'
  )
  returning id into v_campus_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status
  )
  values (
    v_organization_id,
    p_owner_user_id,
    'owner',
    'active'
  )
  returning id into v_membership_id;

  perform public.write_audit_event(
    v_organization_id,
    v_actor,
    'platform.organization_provisioned',
    'organization',
    v_organization_id,
    jsonb_build_object(
      'name', v_name,
      'slug', v_slug,
      'institution_type', p_institution_type,
      'owner_user_id', p_owner_user_id,
      'campus_id', v_campus_id,
      'provisioned_by', 'platform_operator'
    ),
    'success',
    'platform_operator'
  );

  organization_id := v_organization_id;
  campus_id := v_campus_id;
  membership_id := v_membership_id;
  name := v_name;
  slug := v_slug;
  return next;
end;
$$;

comment on function public.platform_create_organization(
  text, text, uuid, text, text, text, text
) is
  'Platform operator provisions an organization with default campus and owner membership for an existing user.';

revoke all on function public.platform_create_organization(
  text, text, uuid, text, text, text, text
) from public, anon;
grant execute on function public.platform_create_organization(
  text, text, uuid, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard stats for operators
-- ---------------------------------------------------------------------------

create or replace function public.platform_dashboard_stats()
returns table (
  organization_count bigint,
  active_organization_count bigint,
  trial_organization_count bigint,
  operator_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::bigint from public.organizations),
    (select count(*)::bigint from public.organizations where status = 'active'),
    (select count(*)::bigint from public.organizations where status = 'trial'),
    (select count(*)::bigint from public.platform_operators where status = 'active');
end;
$$;

revoke all on function public.platform_dashboard_stats() from public, anon;
grant execute on function public.platform_dashboard_stats() to authenticated;
