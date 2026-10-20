-- ILM-PLAT-005: Atomic first-owner organization provisioning
--
-- Authenticated users create an organization + default campus + owner
-- membership in one SECURITY DEFINER transaction. Direct INSERT on
-- organizations remains denied by RLS. Retries use an idempotency key.

-- ---------------------------------------------------------------------------
-- Idempotency ledger (no client Data API access)
-- ---------------------------------------------------------------------------

create table public.organization_provisioning_keys (
  idempotency_key uuid primary key,
  user_id uuid not null
    references public.profiles (id)
    on delete cascade,
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  campus_id uuid not null
    references public.campuses (id)
    on delete restrict,
  membership_id uuid not null
    references public.organization_memberships (id)
    on delete restrict,
  created_at timestamptz not null default now(),
  constraint organization_provisioning_keys_user_org_unique
    unique (user_id, organization_id)
);

comment on table public.organization_provisioning_keys is
  'Idempotency ledger for first-owner org provisioning. Not exposed via Data API.';

create index organization_provisioning_keys_user_id_idx
  on public.organization_provisioning_keys (user_id);

alter table public.organization_provisioning_keys enable row level security;
alter table public.organization_provisioning_keys force row level security;

revoke all on table public.organization_provisioning_keys
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Provisioning RPC
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_with_owner(
  p_name text,
  p_institution_type text,
  p_idempotency_key uuid,
  p_slug text default null,
  p_timezone text default 'Asia/Karachi',
  p_locale text default 'en',
  p_campus_name text default 'Main campus'
)
returns table (
  organization_id uuid,
  campus_id uuid,
  membership_id uuid,
  already_provisioned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := nullif(trim(p_name), '');
  v_slug text := nullif(trim(p_slug), '');
  v_campus_name text := nullif(trim(p_campus_name), '');
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'Asia/Karachi');
  v_locale text := coalesce(nullif(trim(p_locale), ''), 'en');
  v_existing public.organization_provisioning_keys%rowtype;
  v_organization_id uuid;
  v_campus_id uuid;
  v_membership_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'Idempotency key is required'
      using errcode = '22023';
  end if;

  if v_name is null then
    raise exception 'Organization name is required'
      using errcode = '22023';
  end if;

  if p_institution_type is null
     or p_institution_type not in ('school', 'academy', 'both') then
    raise exception 'Invalid institution_type'
      using errcode = '22023';
  end if;

  if v_campus_name is null then
    raise exception 'Campus name is required'
      using errcode = '22023';
  end if;

  if v_slug is not null and v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid organization slug'
      using errcode = '22023';
  end if;

  -- Ensure profile exists (FK target for memberships).
  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  -- Idempotent retry: same key + same user returns prior result.
  select *
  into v_existing
  from public.organization_provisioning_keys as k
  where k.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.user_id is distinct from v_user_id then
      raise exception 'Idempotency key belongs to another user'
        using errcode = '42501';
    end if;

    organization_id := v_existing.organization_id;
    campus_id := v_existing.campus_id;
    membership_id := v_existing.membership_id;
    already_provisioned := true;
    return next;
    return;
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
    v_user_id,
    'owner',
    'active'
  )
  returning id into v_membership_id;

  insert into public.organization_provisioning_keys (
    idempotency_key,
    user_id,
    organization_id,
    campus_id,
    membership_id
  )
  values (
    p_idempotency_key,
    v_user_id,
    v_organization_id,
    v_campus_id,
    v_membership_id
  );

  organization_id := v_organization_id;
  campus_id := v_campus_id;
  membership_id := v_membership_id;
  already_provisioned := false;
  return next;
end;
$$;

comment on function public.create_organization_with_owner(
  text, text, uuid, text, text, text, text
) is
  'Atomically provisions organization, default campus, and active owner membership for auth.uid(). Idempotent on p_idempotency_key. Does not accept a client organization_id.';

revoke all on function public.create_organization_with_owner(
  text, text, uuid, text, text, text, text
) from public;

revoke all on function public.create_organization_with_owner(
  text, text, uuid, text, text, text, text
) from anon;

grant execute on function public.create_organization_with_owner(
  text, text, uuid, text, text, text, text
) to authenticated;
