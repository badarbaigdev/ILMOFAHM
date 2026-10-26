-- Phase 6: Dedicated idempotent school provisioning
--
-- Core path: provision_school_from_application
-- Approval calls the same path after validating status transition.
-- At most one school per application (unique provisioned_school_id + row lock).

-- ---------------------------------------------------------------------------
-- provision_school_from_application
-- ---------------------------------------------------------------------------

create or replace function public.provision_school_from_application(
  p_application_id uuid,
  p_campus_name text default 'Main campus'
)
returns table (
  application_id uuid,
  school_id uuid,
  campus_id uuid,
  invitation_id uuid,
  invitation_token text,
  already_provisioned boolean,
  healed boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_actor uuid := (select auth.uid());
  v_app public.school_applications%rowtype;
  v_school public.schools%rowtype;
  v_school_id uuid;
  v_campus_id uuid;
  v_invitation_id uuid;
  v_slug text;
  v_base_slug text;
  v_attempt integer := 0;
  v_campus_name text := coalesce(nullif(trim(p_campus_name), ''), 'Main campus');
  v_token text;
  v_token_hash text;
  v_healed boolean := false;
  v_created_invite boolean := false;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  -- Serialize concurrent provision attempts for this application
  perform pg_advisory_xact_lock(
    ('x' || substr(md5(p_application_id::text), 1, 16))::bit(64)::bigint
  );

  select * into v_app
  from public.school_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  -- ------------------------------------------------------------------
  -- Idempotent / heal path
  -- ------------------------------------------------------------------
  if v_app.provisioned_school_id is not null then
    select * into v_school
    from public.schools as s
    where s.id = v_app.provisioned_school_id
    for update;

    if not found then
      raise exception 'Provisioned school row missing for application'
        using errcode = 'P0002';
    end if;

    select sc.id into v_campus_id
    from public.school_campuses as sc
    where sc.school_id = v_school.id
      and sc.is_default
    limit 1;

    if v_campus_id is null then
      insert into public.school_campuses (
        school_id, name, city, status, is_default
      )
      values (
        v_school.id, v_campus_name, v_app.city, 'active', true
      )
      returning id into v_campus_id;
      v_healed := true;
    end if;

    select si.id into v_invitation_id
    from public.school_invitations as si
    where si.school_id = v_school.id
      and si.role = 'owner'
      and si.status in ('pending', 'accepted')
    order by si.created_at asc
    limit 1;

    if v_invitation_id is null then
      v_token := encode(gen_random_bytes(32), 'hex');
      v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
      insert into public.school_invitations (
        school_id, email, role, token_hash, status, invited_by, expires_at
      )
      values (
        v_school.id,
        v_app.applicant_email,
        'owner',
        v_token_hash,
        'pending',
        v_actor,
        now() + interval '14 days'
      )
      returning id into v_invitation_id;
      v_healed := true;
      v_created_invite := true;
    end if;

    if v_school.status = 'provisioning' then
      update public.schools
      set status = 'pending_setup', updated_at = now()
      where id = v_school.id;
      v_healed := true;
    end if;

    if v_healed then
      perform public.write_audit_event(
        null,
        v_actor,
        'school.provisioning.healed',
        'school',
        v_school.id,
        jsonb_build_object(
          'application_id', v_app.id,
          'campus_id', v_campus_id,
          'invitation_id', v_invitation_id
        ),
        'success',
        'operator',
        v_school.id
      );
    end if;

    application_id := v_app.id;
    school_id := v_school.id;
    campus_id := v_campus_id;
    invitation_id := v_invitation_id;
    invitation_token := case when v_created_invite then v_token else null end;
    already_provisioned := true;
    healed := v_healed;
    return next;
    return;
  end if;

  -- ------------------------------------------------------------------
  -- Fresh provision: application must already be approved
  -- ------------------------------------------------------------------
  if v_app.status is distinct from 'approved' then
    raise exception
      'Application must be approved before provisioning (status=%)',
      v_app.status
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
    'provisioning',
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

  update public.schools
  set status = 'pending_setup', updated_at = now()
  where id = v_school_id;

  update public.school_applications
  set
    provisioned_school_id = v_school_id,
    provisioned_at = now(),
    updated_at = now()
  where id = p_application_id
  returning * into v_app;

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
  healed := false;
  return next;
end;
$$;

comment on function public.provision_school_from_application(uuid, text) is
  'Idempotent school provisioning from an approved application; heals missing campus/invitation.';

revoke all on function public.provision_school_from_application(uuid, text)
  from public, anon;
grant execute on function public.provision_school_from_application(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- approve_school_application — approve then provision via shared path
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
  v_notes text := nullif(trim(p_review_notes), '');
  v_result record;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5(p_application_id::text), 1, 16))::bit(64)::bigint
  );

  select * into v_app
  from public.school_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  v_from := v_app.status;

  -- Already linked: delegate to provisioner (idempotent / heal)
  if v_app.provisioned_school_id is not null then
    return query
    select
      p.application_id,
      p.school_id,
      p.campus_id,
      p.invitation_id,
      p.invitation_token,
      p.already_provisioned
    from public.provision_school_from_application(
      p_application_id,
      p_campus_name
    ) as p;
    return;
  end if;

  -- Approved but not yet provisioned (recovery) — provision only
  if v_from = 'approved' then
    return query
    select
      p.application_id,
      p.school_id,
      p.campus_id,
      p.invitation_id,
      p.invitation_token,
      p.already_provisioned
    from public.provision_school_from_application(
      p_application_id,
      p_campus_name
    ) as p;
    return;
  end if;

  if not public.school_application_transition_allowed(v_from, 'approved') then
    raise exception 'Status transition from % to approved is not allowed',
      v_from
      using errcode = '22023';
  end if;

  update public.school_applications
  set
    status = 'approved',
    review_notes = coalesce(v_notes, review_notes),
    rejection_reason = null,
    information_request = null,
    reviewer_user_id = v_actor,
    reviewed_at = now(),
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
      'to_status', 'approved'
    ),
    'success',
    'operator',
    null
  );

  select * into v_result
  from public.provision_school_from_application(
    p_application_id,
    p_campus_name
  );

  application_id := v_result.application_id;
  school_id := v_result.school_id;
  campus_id := v_result.campus_id;
  invitation_id := v_result.invitation_id;
  invitation_token := v_result.invitation_token;
  already_provisioned := v_result.already_provisioned;
  return next;
end;
$$;

comment on function public.approve_school_application(uuid, text, text) is
  'Operator approval then idempotent provisioning via provision_school_from_application.';

revoke all on function public.approve_school_application(uuid, text, text)
  from public, anon;
grant execute on function public.approve_school_application(uuid, text, text)
  to authenticated;
