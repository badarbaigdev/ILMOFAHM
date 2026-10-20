-- ILM-PLAT-006: Membership invitations and status changes
--
-- Time-bound, single-use invitation tokens (hashed at rest).
-- Invitee attaches only to the invitation's organization.
-- Membership status transitions are manager-controlled and audited.
-- Full audit platform expansion remains ILM-PLAT-008.

-- ---------------------------------------------------------------------------
-- Profiles: active members may read colleague profiles in shared orgs
-- (needed for member directories; still not an authorization source)
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_org_colleague on public.profiles;

create policy profiles_select_org_colleague
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships as viewer
    join public.organization_memberships as subject
      on subject.organization_id = viewer.organization_id
    where viewer.user_id = (select auth.uid())
      and viewer.status = 'active'
      and subject.user_id = profiles.id
  )
);

-- ---------------------------------------------------------------------------
-- Minimal audit events (membership / invitation actions)
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid
    references public.organizations (id)
    on delete restrict,
  actor_user_id uuid
    references public.profiles (id)
    on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_action_not_blank check (length(trim(action)) > 0),
  constraint audit_events_target_type_not_blank check (
    length(trim(target_type)) > 0
  )
);

comment on table public.audit_events is
  'Append-only audit trail. PLAT-006 writes membership/invitation events; PLAT-008 expands coverage.';

create index audit_events_organization_id_created_at_idx
  on public.audit_events (organization_id, created_at desc);

create index audit_events_actor_user_id_idx
  on public.audit_events (actor_user_id);

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on table public.audit_events from anon, authenticated;
grant select on table public.audit_events to authenticated;
-- inserts only via SECURITY DEFINER helpers

create policy audit_events_select_manager
on public.audit_events
for select
to authenticated
using (
  organization_id is not null
  and public.is_org_manager(organization_id)
);

-- ---------------------------------------------------------------------------
-- Organization invitations
-- ---------------------------------------------------------------------------

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  email text not null,
  role text not null,
  token_hash text not null,
  status text not null default 'pending',
  invited_by uuid not null
    references public.profiles (id)
    on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid
    references public.profiles (id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_email_format check (
    email = lower(trim(email))
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint organization_invitations_role_valid check (
    role in ('admin', 'staff', 'teacher', 'finance', 'guardian')
  ),
  constraint organization_invitations_status_valid check (
    status in ('pending', 'accepted', 'revoked', 'expired')
  ),
  constraint organization_invitations_token_hash_unique unique (token_hash)
);

comment on table public.organization_invitations is
  'Staff/guardian invitations. Token plaintext is shown once; only SHA-256 hash is stored.';

create unique index organization_invitations_pending_email_unique
  on public.organization_invitations (organization_id, email)
  where status = 'pending';

create index organization_invitations_organization_id_idx
  on public.organization_invitations (organization_id);

create index organization_invitations_email_idx
  on public.organization_invitations (email);

create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row
execute function public.set_updated_at();

alter table public.organization_invitations enable row level security;
alter table public.organization_invitations force row level security;

revoke all on table public.organization_invitations from anon, authenticated;
grant select, update on table public.organization_invitations to authenticated;
-- insert/delete via RPC (SECURITY DEFINER)

create policy organization_invitations_select_manager
on public.organization_invitations
for select
to authenticated
using (public.is_org_manager(organization_id));

create policy organization_invitations_update_manager
on public.organization_invitations
for update
to authenticated
using (public.is_org_manager(organization_id))
with check (public.is_org_manager(organization_id));

-- ---------------------------------------------------------------------------
-- Internal audit writer
-- ---------------------------------------------------------------------------

create or replace function public.write_audit_event(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    p_organization_id,
    p_actor_user_id,
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.write_audit_event(
  uuid, uuid, text, text, uuid, jsonb
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create invitation (returns plaintext token once)
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

  -- Ensure inviter profile exists for FK.
  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

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
    )
  );

  invitation_id := v_invitation_id;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

comment on function public.create_organization_invitation(
  uuid, text, text, integer
) is
  'Manager-only: create a time-bound invitation. Returns plaintext token once; stores SHA-256 hash only.';

revoke all on function public.create_organization_invitation(
  uuid, text, text, integer
) from public, anon;

grant execute on function public.create_organization_invitation(
  uuid, text, text, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- Revoke pending invitation
-- ---------------------------------------------------------------------------

create or replace function public.revoke_organization_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_inv public.organization_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select * into v_inv
  from public.organization_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found'
      using errcode = 'P0002';
  end if;

  if not public.is_org_manager(v_inv.organization_id) then
    raise exception 'Not authorized to revoke this invitation'
      using errcode = '42501';
  end if;

  if v_inv.status is distinct from 'pending' then
    raise exception 'Only pending invitations can be revoked'
      using errcode = '22023';
  end if;

  update public.organization_invitations
  set status = 'revoked'
  where id = p_invitation_id;

  perform public.write_audit_event(
    v_inv.organization_id,
    v_user_id,
    'membership.invitation_revoked',
    'organization_invitation',
    p_invitation_id,
    jsonb_build_object('email', v_inv.email, 'role', v_inv.role)
  );
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid)
  from public, anon;

grant execute on function public.revoke_organization_invitation(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Accept invitation (single-use, email must match auth user)
-- ---------------------------------------------------------------------------

create or replace function public.accept_organization_invitation(
  p_token text
)
returns table (
  out_organization_id uuid,
  out_membership_id uuid,
  out_role text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_token text := nullif(trim(p_token), '');
  v_token_hash text;
  v_inv public.organization_invitations%rowtype;
  v_user_email text;
  v_membership_id uuid;
  v_existing public.organization_memberships%rowtype;
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
  from public.organization_invitations as inv
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
    update public.organization_invitations as inv
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
  from public.organization_memberships as m
  where m.organization_id = v_inv.organization_id
    and m.user_id = v_user_id
  for update;

  if found then
    if v_existing.status = 'active' then
      v_membership_id := v_existing.id;
    elsif v_existing.status in ('suspended', 'revoked', 'invited') then
      update public.organization_memberships as m
      set status = 'active',
          role = v_inv.role
      where m.id = v_existing.id
      returning m.id into v_membership_id;
    else
      raise exception 'Existing membership cannot accept this invitation'
        using errcode = '22023';
    end if;
  else
    insert into public.organization_memberships as m (
      organization_id,
      user_id,
      role,
      status
    )
    values (
      v_inv.organization_id,
      v_user_id,
      v_inv.role,
      'active'
    )
    returning m.id into v_membership_id;
  end if;

  update public.organization_invitations as inv
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = v_user_id
  where inv.id = v_inv.id;

  perform public.write_audit_event(
    v_inv.organization_id,
    v_user_id,
    'membership.invitation_accepted',
    'organization_membership',
    v_membership_id,
    jsonb_build_object(
      'invitation_id', v_inv.id,
      'role', v_inv.role,
      'email', v_inv.email
    )
  );

  out_organization_id := v_inv.organization_id;
  out_membership_id := v_membership_id;
  out_role := v_inv.role;
  return next;
end;
$$;

comment on function public.accept_organization_invitation(text) is
  'Accept a pending invitation for auth.uid() when email matches. Single-use; attaches only to the invitation organization.';

revoke all on function public.accept_organization_invitation(text)
  from public, anon;

grant execute on function public.accept_organization_invitation(text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Membership status changes (suspend / revoke / reactivate)
-- ---------------------------------------------------------------------------

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
  from public.organization_memberships
  where id = p_membership_id
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
    from public.organization_memberships
    where organization_id = v_membership.organization_id
      and role = 'owner'
      and status = 'active';

    if v_active_owners <= 1 then
      raise exception 'Cannot suspend or revoke the last active owner'
        using errcode = '22023';
    end if;
  end if;

  if v_membership.status = p_status then
    return;
  end if;

  update public.organization_memberships
  set status = p_status
  where id = p_membership_id;

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
    )
  );
end;
$$;

comment on function public.set_membership_status(uuid, text) is
  'Manager-only membership status transition. Protects last active owner and self-lockout.';

revoke all on function public.set_membership_status(uuid, text)
  from public, anon;

grant execute on function public.set_membership_status(uuid, text)
  to authenticated;
