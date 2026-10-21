-- ILM-ORG-002: Campus setup and contact basics
--
-- Extends campuses with contact fields. Managers create/update via SECURITY
-- DEFINER RPCs with audit. Hard delete is revoked; archive via status instead.
-- organization_id reassignment remains blocked by the existing trigger.

-- ---------------------------------------------------------------------------
-- Contact columns
-- ---------------------------------------------------------------------------

alter table public.campuses
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address_line text;

alter table public.campuses
  drop constraint if exists campuses_phone_not_blank,
  drop constraint if exists campuses_email_format,
  drop constraint if exists campuses_address_not_blank;

alter table public.campuses
  add constraint campuses_phone_not_blank check (
    phone is null or length(trim(phone)) > 0
  ),
  add constraint campuses_email_format check (
    email is null
    or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  add constraint campuses_address_not_blank check (
    address_line is null or length(trim(address_line)) > 0
  );

comment on column public.campuses.phone is
  'Optional campus contact phone (display only; not an auth factor).';
comment on column public.campuses.email is
  'Optional campus contact email (display only; not an auth factor).';
comment on column public.campuses.address_line is
  'Optional single-line campus address for staff display.';

-- Prefer archive over hard delete for authenticated clients.
revoke delete on table public.campuses from authenticated;

drop policy if exists campuses_delete_manager on public.campuses;

-- ---------------------------------------------------------------------------
-- create_organization_campus
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_campus(
  p_organization_id uuid,
  p_name text,
  p_code text default null,
  p_phone text default null,
  p_email text default null,
  p_address_line text default null
)
returns table (
  campus_id uuid,
  organization_id uuid,
  name text,
  code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_phone text := nullif(trim(p_phone), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_address text := nullif(trim(p_address_line), '');
  v_campus_id uuid;
  v_status text;
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
    raise exception 'Not authorized to manage campuses in this organization'
      using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Campus name is required'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid campus email is required when provided'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  -- Avoid RETURNING columns that share names with RETURNS TABLE outputs.
  insert into public.campuses (
    organization_id,
    name,
    code,
    phone,
    email,
    address_line,
    status
  )
  values (
    p_organization_id,
    v_name,
    v_code,
    v_phone,
    v_email,
    v_address,
    'active'
  )
  returning id
  into v_campus_id;

  v_status := 'active';

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'campus.created',
    'campus',
    v_campus_id,
    jsonb_build_object(
      'name', v_name,
      'code', v_code,
      'status', v_status
    ),
    'success',
    v_role
  );

  campus_id := v_campus_id;
  organization_id := p_organization_id;
  name := v_name;
  code := v_code;
  status := v_status;
  return next;
end;
$$;

comment on function public.create_organization_campus(
  uuid, text, text, text, text, text
) is
  'Owner/admin creates a campus in their organization. Audited. Never accepts a foreign organization_id without manager check.';

revoke all on function public.create_organization_campus(
  uuid, text, text, text, text, text
) from public, anon;

grant execute on function public.create_organization_campus(
  uuid, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_organization_campus
-- ---------------------------------------------------------------------------

create or replace function public.update_organization_campus(
  p_campus_id uuid,
  p_name text,
  p_code text default null,
  p_phone text default null,
  p_email text default null,
  p_address_line text default null,
  p_status text default null
)
returns table (
  campus_id uuid,
  organization_id uuid,
  name text,
  code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_org_id uuid;
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_phone text := nullif(trim(p_phone), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_address text := nullif(trim(p_address_line), '');
  v_status text := nullif(trim(p_status), '');
  v_old jsonb;
  v_new_name text;
  v_new_code text;
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_campus_id is null then
    raise exception 'campus_id is required'
      using errcode = '22023';
  end if;

  if v_name is null then
    raise exception 'Campus name is required'
      using errcode = '22023';
  end if;

  if v_status is not null and v_status not in ('active', 'archived') then
    raise exception 'Invalid campus status'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid campus email is required when provided'
      using errcode = '22023';
  end if;

  select c.organization_id,
         jsonb_build_object(
           'name', c.name,
           'code', c.code,
           'phone', c.phone,
           'email', c.email,
           'address_line', c.address_line,
           'status', c.status
         )
  into v_org_id, v_old
  from public.campuses as c
  where c.id = p_campus_id
  for update;

  if not found then
    raise exception 'Campus not found'
      using errcode = 'P0002';
  end if;

  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage campuses in this organization'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.campuses as c
  set
    name = v_name,
    code = v_code,
    phone = v_phone,
    email = v_email,
    address_line = v_address,
    status = coalesce(v_status, c.status)
  where c.id = p_campus_id;

  select c.name, c.code, c.status
  into strict v_new_name, v_new_code, v_new_status
  from public.campuses as c
  where c.id = p_campus_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'campus.updated',
    'campus',
    p_campus_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_new_name,
        'code', v_new_code,
        'phone', v_phone,
        'email', v_email,
        'address_line', v_address,
        'status', v_new_status
      )
    ),
    'success',
    v_role
  );

  campus_id := p_campus_id;
  organization_id := v_org_id;
  name := v_new_name;
  code := v_new_code;
  status := v_new_status;
  return next;
end;
$$;

comment on function public.update_organization_campus(
  uuid, text, text, text, text, text, text
) is
  'Owner/admin updates campus profile/contact/status within the campus organization. Audited. Cannot reassign organization_id.';

revoke all on function public.update_organization_campus(
  uuid, text, text, text, text, text, text
) from public, anon;

grant execute on function public.update_organization_campus(
  uuid, text, text, text, text, text, text
) to authenticated;
