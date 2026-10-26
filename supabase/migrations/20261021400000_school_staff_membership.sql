-- Phase 10: School staff invitations + membership status management
-- Owner invites remain provisioning-only; staff roles via create_school_invitation.

-- ---------------------------------------------------------------------------
-- create_school_invitation
-- ---------------------------------------------------------------------------

create or replace function public.create_school_invitation(
  p_school_id uuid,
  p_email text,
  p_role text,
  p_expires_in_hours integer default 168
)
returns table (
  invitation_id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := lower(trim(p_email));
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
  v_invitation_id uuid;
  v_hours integer := coalesce(p_expires_in_hours, 168);
  v_role text := nullif(trim(p_role), '');
  v_actor_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to invite to this school'
      using errcode = '42501';
  end if;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid email is required'
      using errcode = '22023';
  end if;

  -- Owner is provisioning-only; never via staff invite UI/RPC.
  if v_role is null
     or v_role not in ('admin', 'teacher', 'accountant', 'staff') then
    raise exception 'Invalid invitation role'
      using errcode = '22023';
  end if;

  if v_hours < 1 or v_hours > 720 then
    raise exception 'expires_in_hours must be between 1 and 720'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select m.role
  into v_actor_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + make_interval(hours => v_hours);

  insert into public.school_invitations (
    school_id,
    email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  )
  values (
    p_school_id,
    v_email,
    v_role,
    v_token_hash,
    'pending',
    v_user_id,
    v_expires_at
  )
  returning id into v_invitation_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.invitation.created',
    'school_invitation',
    v_invitation_id,
    jsonb_build_object(
      'role', v_role,
      'expires_at', v_expires_at,
      'school_id', p_school_id
    ),
    'success',
    v_actor_role,
    p_school_id
  );

  invitation_id := v_invitation_id;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

comment on function public.create_school_invitation(uuid, text, text, integer) is
  'School owner/admin: create time-bound staff invitation. Returns plaintext token once; stores SHA-256 hash only. Role cannot be owner.';

revoke all on function public.create_school_invitation(uuid, text, text, integer)
  from public, anon;
grant execute on function public.create_school_invitation(uuid, text, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- revoke_school_invitation
-- ---------------------------------------------------------------------------

create or replace function public.revoke_school_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_inv public.school_invitations%rowtype;
  v_actor_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select * into v_inv
  from public.school_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found'
      using errcode = 'P0002';
  end if;

  if not public.is_school_manager(v_inv.school_id) then
    raise exception 'Not authorized to revoke this invitation'
      using errcode = '42501';
  end if;

  if v_inv.status is distinct from 'pending' then
    raise exception 'Only pending invitations can be revoked'
      using errcode = '22023';
  end if;

  select m.role
  into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_inv.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_invitations
  set status = 'revoked',
      updated_at = now()
  where id = p_invitation_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.invitation.revoked',
    'school_invitation',
    p_invitation_id,
    jsonb_build_object(
      'role', v_inv.role,
      'school_id', v_inv.school_id
    ),
    'success',
    v_actor_role,
    v_inv.school_id
  );
end;
$$;

revoke all on function public.revoke_school_invitation(uuid) from public, anon;
grant execute on function public.revoke_school_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- set_school_membership_status
-- ---------------------------------------------------------------------------

create or replace function public.set_school_membership_status(
  p_membership_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership public.school_memberships%rowtype;
  v_active_owners integer;
  v_actor_role text;
  v_status text := nullif(trim(p_status), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_status is null
     or v_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid membership status'
      using errcode = '22023';
  end if;

  select * into v_membership
  from public.school_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found'
      using errcode = 'P0002';
  end if;

  if not public.is_school_manager(v_membership.school_id) then
    raise exception 'Not authorized to change membership status'
      using errcode = '42501';
  end if;

  if v_membership.user_id = v_user_id
     and v_status in ('suspended', 'revoked') then
    raise exception 'Managers cannot suspend or revoke their own membership'
      using errcode = '22023';
  end if;

  if v_membership.role = 'owner'
     and v_membership.status = 'active'
     and v_status in ('suspended', 'revoked') then
    select count(*)::integer
    into v_active_owners
    from public.school_memberships
    where school_id = v_membership.school_id
      and role = 'owner'
      and status = 'active';

    if v_active_owners <= 1 then
      raise exception 'Cannot suspend or revoke the last active owner'
        using errcode = '22023';
    end if;
  end if;

  if v_membership.status = v_status then
    return;
  end if;

  select m.role
  into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_membership.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_memberships
  set status = v_status,
      updated_at = now()
  where id = p_membership_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.membership.status_changed',
    'school_membership',
    p_membership_id,
    jsonb_build_object(
      'from_status', v_membership.status,
      'to_status', v_status,
      'target_user_id', v_membership.user_id,
      'role', v_membership.role,
      'school_id', v_membership.school_id
    ),
    'success',
    v_actor_role,
    v_membership.school_id
  );
end;
$$;

comment on function public.set_school_membership_status(uuid, text) is
  'School owner/admin: membership status transition. Protects last active owner and self-lockout.';

revoke all on function public.set_school_membership_status(uuid, text)
  from public, anon;
grant execute on function public.set_school_membership_status(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- set_school_membership_role (non-owner roles only)
-- ---------------------------------------------------------------------------

create or replace function public.set_school_membership_role(
  p_membership_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_membership public.school_memberships%rowtype;
  v_role text := nullif(trim(p_role), '');
  v_actor_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_role is null
     or v_role not in ('admin', 'teacher', 'accountant', 'staff') then
    raise exception 'Invalid membership role'
      using errcode = '22023';
  end if;

  select * into v_membership
  from public.school_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found'
      using errcode = 'P0002';
  end if;

  if not public.is_school_manager(v_membership.school_id) then
    raise exception 'Not authorized to change membership role'
      using errcode = '42501';
  end if;

  if v_membership.role = 'owner' then
    raise exception 'Cannot change the owner role via this path'
      using errcode = '22023';
  end if;

  if v_membership.user_id = v_user_id then
    raise exception 'Managers cannot change their own role'
      using errcode = '22023';
  end if;

  if v_membership.role = v_role then
    return;
  end if;

  select m.role
  into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_membership.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_memberships
  set role = v_role,
      updated_at = now()
  where id = p_membership_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.membership.role_changed',
    'school_membership',
    p_membership_id,
    jsonb_build_object(
      'from_role', v_membership.role,
      'to_role', v_role,
      'target_user_id', v_membership.user_id,
      'school_id', v_membership.school_id
    ),
    'success',
    v_actor_role,
    v_membership.school_id
  );
end;
$$;

revoke all on function public.set_school_membership_role(uuid, text)
  from public, anon;
grant execute on function public.set_school_membership_role(uuid, text)
  to authenticated;
