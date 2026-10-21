-- ILM-PLAT-008: Audit-event foundation for privileged actions
--
-- Extends the PLAT-006 audit_events table: outcome, actor role snapshot,
-- append-only enforcement, metadata sanitization (no secrets), and
-- organization-provisioning audit emission.

-- ---------------------------------------------------------------------------
-- Schema extensions
-- ---------------------------------------------------------------------------

alter table public.audit_events
  add column if not exists outcome text not null default 'success',
  add column if not exists actor_role text;

alter table public.audit_events
  drop constraint if exists audit_events_outcome_valid;

alter table public.audit_events
  add constraint audit_events_outcome_valid check (
    outcome in ('success', 'failure', 'denied')
  );

comment on table public.audit_events is
  'Append-only audit trail for privileged actions. Writers are SECURITY DEFINER helpers only; managers may SELECT.';

comment on column public.audit_events.outcome is
  'success | failure | denied — how the privileged action concluded.';

comment on column public.audit_events.actor_role is
  'Membership role of the actor at write time when known; not an authorization source.';

comment on column public.audit_events.metadata is
  'Safe JSON metadata only. Secrets and tokens must never be stored.';

-- ---------------------------------------------------------------------------
-- Append-only: reject UPDATE and DELETE
-- ---------------------------------------------------------------------------

create or replace function public.reject_audit_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are append-only'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists audit_events_reject_update on public.audit_events;
drop trigger if exists audit_events_reject_delete on public.audit_events;

create trigger audit_events_reject_update
before update on public.audit_events
for each row
execute function public.reject_audit_events_mutation();

create trigger audit_events_reject_delete
before delete on public.audit_events
for each row
execute function public.reject_audit_events_mutation();

-- ---------------------------------------------------------------------------
-- Metadata sanitization (strip secrets / redact emails)
-- ---------------------------------------------------------------------------

create or replace function public.sanitize_audit_metadata(p_metadata jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_key text;
  v_value jsonb;
  v_lower_key text;
  v_text text;
  v_at integer;
begin
  if p_metadata is null or jsonb_typeof(p_metadata) is distinct from 'object' then
    return '{}'::jsonb;
  end if;

  for v_key, v_value in
    select key, value from jsonb_each(p_metadata)
  loop
    v_lower_key := lower(v_key);

    if v_lower_key ~ '(password|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|credit[_-]?card|ssn|session)' then
      continue;
    end if;

    if jsonb_typeof(v_value) = 'object' then
      v_result := v_result || jsonb_build_object(
        v_key,
        public.sanitize_audit_metadata(v_value)
      );
      continue;
    end if;

    if v_lower_key in ('email', 'invitee_email', 'actor_email')
       and jsonb_typeof(v_value) = 'string' then
      v_text := trim(both '"' from v_value::text);
      v_at := position('@' in v_text);
      if v_at > 1 then
        v_result := v_result || jsonb_build_object(
          v_key,
          left(v_text, 1) || '***' || substring(v_text from v_at)
        );
      else
        v_result := v_result || jsonb_build_object(v_key, '[redacted]');
      end if;
      continue;
    end if;

    v_result := v_result || jsonb_build_object(v_key, v_value);
  end loop;

  return v_result;
end;
$$;

comment on function public.sanitize_audit_metadata(jsonb) is
  'Removes secret-like keys and redacts email values before audit persistence.';

revoke all on function public.sanitize_audit_metadata(jsonb)
  from public, anon, authenticated;

grant execute on function public.sanitize_audit_metadata(jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Enhanced writer (still not executable by clients)
-- ---------------------------------------------------------------------------

-- Replace the PLAT-006 6-arg signature with an extended one (defaults keep
-- existing 6-arg call sites valid).
drop function if exists public.write_audit_event(
  uuid, uuid, text, text, uuid, jsonb
);

create or replace function public.write_audit_event(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_outcome text default 'success',
  p_actor_role text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_outcome text := coalesce(nullif(trim(p_outcome), ''), 'success');
  v_action text := nullif(trim(p_action), '');
  v_target_type text := nullif(trim(p_target_type), '');
begin
  if v_action is null then
    raise exception 'audit action is required'
      using errcode = '22023';
  end if;

  if v_target_type is null then
    raise exception 'audit target_type is required'
      using errcode = '22023';
  end if;

  if v_outcome not in ('success', 'failure', 'denied') then
    raise exception 'invalid audit outcome'
      using errcode = '22023';
  end if;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata,
    outcome,
    actor_role
  )
  values (
    p_organization_id,
    p_actor_user_id,
    v_action,
    v_target_type,
    p_target_id,
    public.sanitize_audit_metadata(coalesce(p_metadata, '{}'::jsonb)),
    v_outcome,
    nullif(trim(p_actor_role), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Keep legacy 6-arg calls working via default args on the new signature.
-- Drop old overload if Postgres treats it as distinct (same name+arity change).
-- New signature has 8 params with defaults, so existing 6-arg calls still resolve.

revoke all on function public.write_audit_event(
  uuid, uuid, text, text, uuid, jsonb, text, text
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Client-callable recorder: actor forced to auth.uid(); org membership required
-- ---------------------------------------------------------------------------

create or replace function public.record_audit_event(
  p_organization_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_outcome text default 'success'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id is required'
      using errcode = '22023';
  end if;

  if not public.is_active_org_member(p_organization_id) then
    raise exception 'Not authorized to record audit for this organization'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  return public.write_audit_event(
    p_organization_id,
    v_user_id,
    p_action,
    p_target_type,
    p_target_id,
    p_metadata,
    p_outcome,
    v_role
  );
end;
$$;

comment on function public.record_audit_event(
  uuid, text, text, uuid, jsonb, text
) is
  'Authenticated active members may append sanitized audit events for their organization. Actor is always auth.uid().';

revoke all on function public.record_audit_event(
  uuid, text, text, uuid, jsonb, text
) from public, anon;

grant execute on function public.record_audit_event(
  uuid, text, text, uuid, jsonb, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Emit audit on first-owner organization provisioning
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

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

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

  perform public.write_audit_event(
    v_organization_id,
    v_user_id,
    'organization.provisioned',
    'organization',
    v_organization_id,
    jsonb_build_object(
      'institution_type', p_institution_type,
      'campus_id', v_campus_id,
      'membership_id', v_membership_id,
      'slug', v_slug
    ),
    'success',
    'owner'
  );

  organization_id := v_organization_id;
  campus_id := v_campus_id;
  membership_id := v_membership_id;
  already_provisioned := false;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enrich membership RPCs with actor_role on audit writes
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_invitation(
  p_organization_id uuid,
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
  v_actor_role text;
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
    raise exception 'Not authorized to invite to this organization'
      using errcode = '42501';
  end if;

  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid email is required'
      using errcode = '22023';
  end if;

  if p_role is null
     or p_role not in ('admin', 'staff', 'teacher', 'finance', 'guardian') then
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
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + make_interval(hours => v_hours);

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  )
  values (
    p_organization_id,
    v_email,
    p_role,
    v_token_hash,
    'pending',
    v_user_id,
    v_expires_at
  )
  returning id into v_invitation_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'membership.invitation_created',
    'organization_invitation',
    v_invitation_id,
    jsonb_build_object(
      'email', v_email,
      'role', p_role,
      'expires_at', v_expires_at
    ),
    'success',
    v_actor_role
  );

  invitation_id := v_invitation_id;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

create or replace function public.set_membership_status(
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
  v_membership public.organization_memberships%rowtype;
  v_active_owners integer;
  v_actor_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_status is null
     or p_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid membership status'
      using errcode = '22023';
  end if;

  select * into v_membership
  from public.organization_memberships as m
  where m.id = p_membership_id
  for update;

  if not found then
    raise exception 'Membership not found'
      using errcode = 'P0002';
  end if;

  if not public.is_org_manager(v_membership.organization_id) then
    raise exception 'Not authorized to change membership status'
      using errcode = '42501';
  end if;

  if v_membership.user_id = v_user_id
     and p_status in ('suspended', 'revoked') then
    raise exception 'Managers cannot suspend or revoke their own membership'
      using errcode = '22023';
  end if;

  if v_membership.role = 'owner'
     and v_membership.status = 'active'
     and p_status in ('suspended', 'revoked') then
    select count(*)::integer
    into v_active_owners
    from public.organization_memberships as m
    where m.organization_id = v_membership.organization_id
      and m.role = 'owner'
      and m.status = 'active';

    if v_active_owners <= 1 then
      raise exception 'Cannot suspend or revoke the last active owner'
        using errcode = '22023';
    end if;
  end if;

  if v_membership.status = p_status then
    return;
  end if;

  select m.role
  into v_actor_role
  from public.organization_memberships as m
  where m.organization_id = v_membership.organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.organization_memberships as m
  set status = p_status
  where m.id = p_membership_id;

  perform public.write_audit_event(
    v_membership.organization_id,
    v_user_id,
    'membership.status_changed',
    'organization_membership',
    p_membership_id,
    jsonb_build_object(
      'from_status', v_membership.status,
      'to_status', p_status,
      'target_user_id', v_membership.user_id,
      'role', v_membership.role
    ),
    'success',
    v_actor_role
  );
end;
$$;
