-- Phase 7: Accept school invitation → school_memberships (owner/admin/…)
--
-- Token is plaintext once; only SHA-256 hash is stored.
-- Accept requires auth.uid() email to match invitation email.

create or replace function public.accept_school_invitation(
  p_token text
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
  v_user_id uuid := (select auth.uid());
  v_token text := nullif(trim(p_token), '');
  v_token_hash text;
  v_inv public.school_invitations%rowtype;
  v_user_email text;
  v_membership_id uuid;
  v_existing public.school_memberships%rowtype;
  v_school public.schools%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if v_token is null or length(v_token) < 32 then
    raise exception 'Invitation token is required'
      using errcode = '22023';
  end if;

  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  select * into v_inv
  from public.school_invitations as inv
  where inv.token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Invalid invitation token'
      using errcode = 'P0002';
  end if;

  if v_inv.status = 'accepted' then
    raise exception 'Invitation has already been used'
      using errcode = '22023';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'Invitation has been revoked'
      using errcode = '22023';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    update public.school_invitations as inv
    set status = 'expired'
    where inv.id = v_inv.id
      and inv.status = 'pending';

    raise exception 'Invitation has expired'
      using errcode = '22023';
  end if;

  if v_inv.status is distinct from 'pending' then
    raise exception 'Invitation is not available'
      using errcode = '22023';
  end if;

  select * into v_school
  from public.schools as s
  where s.id = v_inv.school_id
  for update;

  if not found then
    raise exception 'School not found for invitation'
      using errcode = 'P0002';
  end if;

  if v_school.status in ('closed', 'suspended') then
    raise exception 'School is not available for activation'
      using errcode = '22023';
  end if;

  select lower(u.email)
  into v_user_email
  from auth.users as u
  where u.id = v_user_id;

  if v_user_email is null or v_user_email is distinct from v_inv.email then
    raise exception 'Signed-in email does not match this invitation'
      using errcode = '42501';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select * into v_existing
  from public.school_memberships as m
  where m.school_id = v_inv.school_id
    and m.user_id = v_user_id
  for update;

  if found then
    if v_existing.status = 'active' then
      -- Idempotent re-accept for already-active member: still consume invite
      v_membership_id := v_existing.id;
      if v_existing.role is distinct from v_inv.role then
        update public.school_memberships as m
        set role = v_inv.role,
            updated_at = now()
        where m.id = v_existing.id;
      end if;
    elsif v_existing.status in ('suspended', 'revoked', 'invited') then
      update public.school_memberships as m
      set status = 'active',
          role = v_inv.role,
          updated_at = now()
      where m.id = v_existing.id
      returning m.id into v_membership_id;
    else
      raise exception 'Existing membership cannot accept this invitation'
        using errcode = '22023';
    end if;
  else
    insert into public.school_memberships as m (
      school_id,
      user_id,
      role,
      status
    )
    values (
      v_inv.school_id,
      v_user_id,
      v_inv.role,
      'active'
    )
    returning m.id into v_membership_id;
  end if;

  update public.school_invitations as inv
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = v_user_id,
      updated_at = now()
  where inv.id = v_inv.id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.invitation.accepted',
    'school_membership',
    v_membership_id,
    jsonb_build_object(
      'invitation_id', v_inv.id,
      'role', v_inv.role,
      'school_id', v_inv.school_id
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

comment on function public.accept_school_invitation(text) is
  'Accept a pending school invitation for auth.uid() when email matches. Single-use; attaches membership only to the invitation school.';

revoke all on function public.accept_school_invitation(text)
  from public, anon;
grant execute on function public.accept_school_invitation(text)
  to authenticated;
