-- ILM-ORG-001: Organization profile and operating mode
--
-- Managers may update display name and institution_type via a SECURITY DEFINER
-- RPC with audit. Lifecycle columns (status, slug, id) are protected from
-- client Data API updates. School/academy/both drives which workflows may be
-- enabled in the application layer.

-- ---------------------------------------------------------------------------
-- Protect immutable / lifecycle columns on organizations
-- ---------------------------------------------------------------------------

create or replace function public.protect_organization_lifecycle_columns()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'organizations.id cannot be changed'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status then
    raise exception 'organizations.status cannot be changed via Data API'
      using errcode = 'check_violation';
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'organizations.slug cannot be changed via Data API'
      using errcode = 'check_violation';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'organizations.created_at cannot be changed'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.protect_organization_lifecycle_columns() is
  'Rejects client updates that attempt to change organization id, status, slug, or created_at.';

drop trigger if exists organizations_protect_lifecycle on public.organizations;

create trigger organizations_protect_lifecycle
before update on public.organizations
for each row
execute function public.protect_organization_lifecycle_columns();

-- ---------------------------------------------------------------------------
-- update_organization_profile
-- ---------------------------------------------------------------------------

create or replace function public.update_organization_profile(
  p_organization_id uuid,
  p_name text,
  p_institution_type text
)
returns table (
  organization_id uuid,
  name text,
  institution_type text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_type text := nullif(trim(p_institution_type), '');
  v_old_name text;
  v_old_type text;
  v_new_name text;
  v_new_type text;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id is required'
      using errcode = '22023';
  end if;

  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to update this organization'
      using errcode = '42501';
  end if;

  if v_name is null or length(v_name) < 2 then
    raise exception 'Organization name must be at least 2 characters'
      using errcode = '22023';
  end if;

  if v_type is null or v_type not in ('school', 'academy', 'both') then
    raise exception 'Invalid institution_type'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select o.name, o.institution_type
  into v_old_name, v_old_type
  from public.organizations as o
  where o.id = p_organization_id
  for update;

  if not found then
    raise exception 'Organization not found'
      using errcode = 'P0002';
  end if;

  update public.organizations as o
  set
    name = v_name,
    institution_type = v_type
  where o.id = p_organization_id
  returning o.name, o.institution_type, o.updated_at
  into v_new_name, v_new_type, v_updated_at;

  if v_old_name is distinct from v_new_name
     or v_old_type is distinct from v_new_type then
    perform public.write_audit_event(
      p_organization_id,
      v_user_id,
      'organization.profile_updated',
      'organization',
      p_organization_id,
      jsonb_build_object(
        'before', jsonb_build_object(
          'name', v_old_name,
          'institution_type', v_old_type
        ),
        'after', jsonb_build_object(
          'name', v_new_name,
          'institution_type', v_new_type
        )
      ),
      'success',
      v_role
    );
  end if;

  organization_id := p_organization_id;
  name := v_new_name;
  institution_type := v_new_type;
  updated_at := v_updated_at;
  return next;
end;
$$;

comment on function public.update_organization_profile(uuid, text, text) is
  'Owner/admin updates organization display name and institution_type. Audits before/after. Does not change status or slug.';

revoke all on function public.update_organization_profile(uuid, text, text)
  from public, anon;

grant execute on function public.update_organization_profile(uuid, text, text)
  to authenticated;
