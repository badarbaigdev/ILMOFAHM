-- Service-role activation: attach membership for a known user_id when the
-- invitation token is valid and the Auth user's email matches the invite.
-- Used by the one-click "open school from approval link" path (no prior signup).

create or replace function public.activate_school_invitation(
  p_token text,
  p_user_id uuid
)
returns table (
  out_school_id uuid,
  out_membership_id uuid,
  out_role text,
  out_school_name text,
  out_school_status text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := nullif(trim(p_token), '');
  v_token_hash text;
  v_inv public.school_invitations%rowtype;
  v_user_email text;
  v_membership_id uuid;
  v_existing public.school_memberships%rowtype;
  v_school public.schools%rowtype;
begin
  if p_user_id is null then
    raise exception 'user_id is required' using errcode = '22023';
  end if;

  if v_token is null or length(v_token) < 32 then
    raise exception 'Invitation token is required' using errcode = '22023';
  end if;

  -- Execute grant is service_role only (see revoke/grant below).

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  select * into v_inv
  from public.school_invitations as inv
  where inv.token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Invalid invitation token' using errcode = 'P0002';
  end if;

  if v_inv.status = 'accepted' then
    -- Idempotent: allow re-entry if the same user already accepted.
    if v_inv.accepted_by is distinct from p_user_id then
      raise exception 'Invitation has already been used' using errcode = '22023';
    end if;

    select * into v_school
    from public.schools as s
    where s.id = v_inv.school_id;

    select m.id into v_membership_id
    from public.school_memberships as m
    where m.school_id = v_inv.school_id
      and m.user_id = p_user_id
      and m.status = 'active'
    limit 1;

    if v_membership_id is null then
      raise exception 'Invitation has already been used' using errcode = '22023';
    end if;

    out_school_id := v_inv.school_id;
    out_membership_id := v_membership_id;
    out_role := v_inv.role;
    out_school_name := v_school.name;
    out_school_status := v_school.status;
    return next;
    return;
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'Invitation has been revoked' using errcode = '22023';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    update public.school_invitations as inv
    set status = 'expired'
    where inv.id = v_inv.id
      and inv.status = 'pending';
    raise exception 'Invitation has expired' using errcode = '22023';
  end if;

  if v_inv.status is distinct from 'pending' then
    raise exception 'Invitation is not available' using errcode = '22023';
  end if;

  select * into v_school
  from public.schools as s
  where s.id = v_inv.school_id
  for update;

  if not found then
    raise exception 'School not found for invitation' using errcode = 'P0002';
  end if;

  if v_school.status in ('closed', 'suspended') then
    raise exception 'School is not available for activation' using errcode = '22023';
  end if;

  select lower(u.email)
  into v_user_email
  from auth.users as u
  where u.id = p_user_id;

  if v_user_email is null or v_user_email is distinct from lower(v_inv.email) then
    raise exception 'User email does not match this invitation'
      using errcode = '42501';
  end if;

  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  select * into v_existing
  from public.school_memberships as m
  where m.school_id = v_inv.school_id
    and m.user_id = p_user_id
  for update;

  if found then
    if v_existing.status = 'active' then
      v_membership_id := v_existing.id;
      if v_existing.role is distinct from v_inv.role then
        update public.school_memberships as m
        set role = v_inv.role, updated_at = now()
        where m.id = v_existing.id;
      end if;
    elsif v_existing.status in ('suspended', 'revoked', 'invited') then
      update public.school_memberships as m
      set status = 'active', role = v_inv.role, updated_at = now()
      where m.id = v_existing.id
      returning m.id into v_membership_id;
    else
      raise exception 'Existing membership cannot accept this invitation'
        using errcode = '22023';
    end if;
  else
    insert into public.school_memberships (school_id, user_id, role, status)
    values (v_inv.school_id, p_user_id, v_inv.role, 'active')
    returning id into v_membership_id;
  end if;

  update public.school_invitations as inv
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = p_user_id,
      updated_at = now()
  where inv.id = v_inv.id;

  perform public.write_audit_event(
    null,
    p_user_id,
    'school.invitation.activated',
    'school_membership',
    v_membership_id,
    jsonb_build_object(
      'invitation_id', v_inv.id,
      'role', v_inv.role,
      'school_id', v_inv.school_id,
      'via', 'approval_link'
    ),
    'success',
    v_inv.role,
    v_inv.school_id
  );

  out_school_id := v_inv.school_id;
  out_membership_id := v_membership_id;
  out_role := v_inv.role;
  out_school_name := v_school.name;
  out_school_status := v_school.status;
  return next;
end;
$$;

comment on function public.activate_school_invitation(text, uuid) is
  'Service-role only: consume school invitation for a matching Auth user (one-click approval-link entry).';

revoke all on function public.activate_school_invitation(text, uuid)
  from public, anon, authenticated;
grant execute on function public.activate_school_invitation(text, uuid)
  to service_role;
