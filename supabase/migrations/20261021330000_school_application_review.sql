-- Phase 5: Platform operator school application review + controlled approval
--
-- Status transitions are enforced in SECURITY DEFINER RPCs.
-- Approval provisions school + default campus + owner invitation atomically.
-- Direct client UPDATEs on school_applications are revoked (select remains).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Transition rules
-- ---------------------------------------------------------------------------

create or replace function public.school_application_transition_allowed(
  p_from text,
  p_to text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = p_to then false
    when p_from = 'pending' and p_to in (
      'under_review', 'information_requested', 'rejected', 'approved'
    ) then true
    when p_from = 'under_review' and p_to in (
      'information_requested', 'rejected', 'approved', 'pending'
    ) then true
    when p_from = 'information_requested' and p_to in (
      'under_review', 'rejected', 'approved'
    ) then true
    when p_from = 'rejected' and p_to = 'under_review' then true
    else false
  end;
$$;

comment on function public.school_application_transition_allowed(text, text) is
  'Whether a school_applications status transition is allowed.';

revoke all on function public.school_application_transition_allowed(text, text)
  from public;
grant execute on function public.school_application_transition_allowed(text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Slug helper for provisioned schools
-- ---------------------------------------------------------------------------

create or replace function public.slugify_school_name(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_slug text;
begin
  v_slug := lower(trim(coalesce(p_name, '')));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  if v_slug = '' then
    return 'school';
  end if;
  return left(v_slug, 48);
end;
$$;

revoke all on function public.slugify_school_name(text) from public;
grant execute on function public.slugify_school_name(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Block direct client mutation of applications (operators use RPCs)
-- ---------------------------------------------------------------------------

revoke update on table public.school_applications from authenticated;

drop policy if exists school_applications_update_operator
  on public.school_applications;

-- ---------------------------------------------------------------------------
-- Non-approval review transitions
-- ---------------------------------------------------------------------------

create or replace function public.review_school_application(
  p_application_id uuid,
  p_to_status text,
  p_review_notes text default null,
  p_rejection_reason text default null,
  p_information_request text default null
)
returns public.school_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_row public.school_applications%rowtype;
  v_from text;
  v_to text := nullif(trim(p_to_status), '');
  v_notes text := nullif(trim(p_review_notes), '');
  v_rejection text := nullif(trim(p_rejection_reason), '');
  v_info text := nullif(trim(p_information_request), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  if v_to is null or v_to = 'approved' then
    raise exception 'Use approve_school_application for approvals'
      using errcode = '22023';
  end if;

  select * into v_row
  from public.school_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  v_from := v_row.status;

  if not public.school_application_transition_allowed(v_from, v_to) then
    raise exception 'Status transition from % to % is not allowed',
      v_from, v_to
      using errcode = '22023';
  end if;

  if v_to = 'rejected' and v_rejection is null then
    raise exception 'Rejection reason is required'
      using errcode = '22023';
  end if;

  if v_to = 'information_requested' and v_info is null then
    raise exception 'Information request message is required'
      using errcode = '22023';
  end if;

  update public.school_applications
  set
    status = v_to,
    review_notes = coalesce(v_notes, review_notes),
    rejection_reason = case
      when v_to = 'rejected' then v_rejection
      when v_to = 'under_review' then null
      else rejection_reason
    end,
    information_request = case
      when v_to = 'information_requested' then v_info
      when v_to in ('under_review', 'pending') then null
      else information_request
    end,
    reviewer_user_id = v_actor,
    reviewed_at = now(),
    updated_at = now()
  where id = p_application_id
  returning * into v_row;

  perform public.write_audit_event(
    null,
    v_actor,
    'school.application.reviewed',
    'school_application',
    v_row.id,
    jsonb_build_object(
      'from_status', v_from,
      'to_status', v_to,
      'has_rejection_reason', v_rejection is not null,
      'has_information_request', v_info is not null
    ),
    'success',
    'operator',
    null
  );

  return v_row;
end;
$$;

comment on function public.review_school_application(uuid, text, text, text, text) is
  'Platform operator status transition for school applications (not approval).';

revoke all on function public.review_school_application(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.review_school_application(uuid, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Approval + provisioning (controlled; idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.approve_school_application(
  p_application_id uuid,
  p_review_notes text default null,
  p_campus_name text default 'Main campus'
)
returns table (
  application_id uuid,
  school_id uuid,
  campus_id uuid,
  invitation_id uuid,
  invitation_token text,
  already_provisioned boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor uuid := (select auth.uid());
  v_app public.school_applications%rowtype;
  v_from text;
  v_school_id uuid;
  v_campus_id uuid;
  v_invitation_id uuid;
  v_slug text;
  v_base_slug text;
  v_attempt integer := 0;
  v_campus_name text := coalesce(nullif(trim(p_campus_name), ''), 'Main campus');
  v_notes text := nullif(trim(p_review_notes), '');
  v_token text;
  v_token_hash text;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  select * into v_app
  from public.school_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  v_from := v_app.status;

  -- Idempotent replay: already provisioned
  if v_app.provisioned_school_id is not null then
    select si.id into v_invitation_id
    from public.school_invitations as si
    where si.school_id = v_app.provisioned_school_id
      and si.role = 'owner'
    order by si.created_at asc
    limit 1;

    select sc.id into v_campus_id
    from public.school_campuses as sc
    where sc.school_id = v_app.provisioned_school_id
      and sc.is_default
    limit 1;

    application_id := v_app.id;
    school_id := v_app.provisioned_school_id;
    campus_id := v_campus_id;
    invitation_id := v_invitation_id;
    invitation_token := null;
    already_provisioned := true;
    return next;
    return;
  end if;

  if not public.school_application_transition_allowed(v_from, 'approved') then
    raise exception 'Status transition from % to approved is not allowed',
      v_from
      using errcode = '22023';
  end if;

  v_base_slug := public.slugify_school_name(v_app.school_name);
  v_slug := v_base_slug;
  while exists (select 1 from public.schools as s where s.slug = v_slug) loop
    v_attempt := v_attempt + 1;
    v_slug := left(v_base_slug, 40) || '-' || v_attempt::text;
    if v_attempt > 50 then
      raise exception 'Could not allocate a unique school slug'
        using errcode = '23505';
    end if;
  end loop;

  insert into public.schools (
    name,
    slug,
    status,
    email,
    phone,
    city,
    country_code,
    institution_type,
    default_locale,
    timezone
  )
  values (
    v_app.school_name,
    v_slug,
    'pending_setup',
    v_app.applicant_email,
    v_app.phone,
    v_app.city,
    v_app.country_code,
    v_app.institution_type,
    'en',
    'Asia/Karachi'
  )
  returning id into v_school_id;

  insert into public.school_campuses (
    school_id,
    name,
    city,
    status,
    is_default
  )
  values (
    v_school_id,
    v_campus_name,
    v_app.city,
    'active',
    true
  )
  returning id into v_campus_id;

  -- Owner invitation: plaintext returned once; only hash stored
  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

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
    v_school_id,
    v_app.applicant_email,
    'owner',
    v_token_hash,
    'pending',
    v_actor,
    now() + interval '14 days'
  )
  returning id into v_invitation_id;

  update public.school_applications
  set
    status = 'approved',
    review_notes = coalesce(v_notes, review_notes),
    rejection_reason = null,
    information_request = null,
    reviewer_user_id = v_actor,
    reviewed_at = now(),
    provisioned_school_id = v_school_id,
    provisioned_at = now(),
    updated_at = now()
  where id = p_application_id
  returning * into v_app;

  perform public.write_audit_event(
    null,
    v_actor,
    'school.application.approved',
    'school_application',
    v_app.id,
    jsonb_build_object(
      'from_status', v_from,
      'school_id', v_school_id,
      'campus_id', v_campus_id,
      'invitation_id', v_invitation_id
    ),
    'success',
    'operator',
    v_school_id
  );

  perform public.write_audit_event(
    null,
    v_actor,
    'school.provisioned',
    'school',
    v_school_id,
    jsonb_build_object(
      'application_id', v_app.id,
      'campus_id', v_campus_id,
      'invitation_id', v_invitation_id
    ),
    'success',
    'operator',
    v_school_id
  );

  application_id := v_app.id;
  school_id := v_school_id;
  campus_id := v_campus_id;
  invitation_id := v_invitation_id;
  invitation_token := v_token;
  already_provisioned := false;
  return next;
end;
$$;

comment on function public.approve_school_application(uuid, text, text) is
  'Operator approval: validates transition, provisions school + default campus + owner invitation idempotently.';

revoke all on function public.approve_school_application(uuid, text, text)
  from public, anon;
grant execute on function public.approve_school_application(uuid, text, text)
  to authenticated;
