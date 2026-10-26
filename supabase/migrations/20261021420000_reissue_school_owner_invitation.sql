-- Platform operators may mint a fresh owner activation link when the
-- previous plaintext token was lost (hash-only storage). Pending only.

create or replace function public.reissue_school_owner_invitation(
  p_school_id uuid
)
returns table (
  invitation_id uuid,
  school_id uuid,
  email text,
  invitation_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor uuid := (select auth.uid());
  v_school record;
  v_email text;
  v_token text;
  v_token_hash text;
  v_expires timestamptz := now() + interval '14 days';
  v_invitation_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized to reissue school invitations'
      using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;

  select s.id, s.name, s.status
  into v_school
  from public.schools as s
  where s.id = p_school_id
  for update;

  if not found then
    raise exception 'School not found' using errcode = 'P0002';
  end if;

  if v_school.status not in ('pending_setup', 'active', 'provisioning') then
    raise exception 'School is not available for owner invitation'
      using errcode = '22023';
  end if;

  -- Prefer applicant email from the linked application; fall back to pending invite.
  select a.applicant_email
  into v_email
  from public.school_applications as a
  where a.provisioned_school_id = p_school_id
  order by a.updated_at desc nulls last
  limit 1;

  if v_email is null then
    select si.email
    into v_email
    from public.school_invitations as si
    where si.school_id = p_school_id
      and si.role = 'owner'
      and si.status = 'pending'
    order by si.created_at desc
    limit 1;
  end if;

  if v_email is null then
    raise exception 'No owner email found for this school'
      using errcode = 'P0002';
  end if;

  -- Invalidate any pending owner invites so only the new token works.
  update public.school_invitations as si
  set status = 'revoked',
      updated_at = now()
  where si.school_id = p_school_id
    and si.role = 'owner'
    and si.status = 'pending';

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.school_invitations (
    school_id, email, role, token_hash, status, invited_by, expires_at
  )
  values (
    p_school_id,
    lower(trim(v_email)),
    'owner',
    v_token_hash,
    'pending',
    v_actor,
    v_expires
  )
  returning id into v_invitation_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'school.owner_invitation.reissued',
    'school_invitation',
    v_invitation_id,
    jsonb_build_object(
      'school_id', p_school_id,
      'expires_at', v_expires
    ),
    'success',
    'operator',
    p_school_id
  );

  invitation_id := v_invitation_id;
  school_id := p_school_id;
  email := lower(trim(v_email));
  invitation_token := v_token;
  expires_at := v_expires;
  return next;
end;
$$;

comment on function public.reissue_school_owner_invitation(uuid) is
  'Platform operator: revoke pending owner invites and mint a new shareable activation token (returned once).';

revoke all on function public.reissue_school_owner_invitation(uuid)
  from public, anon;
grant execute on function public.reissue_school_owner_invitation(uuid)
  to authenticated;
