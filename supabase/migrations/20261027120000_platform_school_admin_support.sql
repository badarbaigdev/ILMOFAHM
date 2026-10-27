-- Platform operators: manage school staff + time-limited support sessions (ILM-PLT-011).

-- ---------------------------------------------------------------------------
-- Helpers: platform may manage staff; support sessions grant school manager powers
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_school_staff(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_school_manager(p_school_id)
      or public.is_platform_operator();
$$;

comment on function public.can_manage_school_staff(uuid) is
  'True when the caller is a school owner/admin or an active platform operator.';

revoke all on function public.can_manage_school_staff(uuid) from public;
grant execute on function public.can_manage_school_staff(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- school_support_sessions (time-limited, audited “enter school” access)
-- ---------------------------------------------------------------------------

create table public.school_support_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  operator_user_id uuid not null
    references auth.users (id)
    on delete restrict,
  reason text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_support_sessions_reason_length check (
    length(trim(reason)) >= 8 and length(reason) <= 500
  ),
  constraint school_support_sessions_expiry_after_start check (
    expires_at > started_at
  ),
  constraint school_support_sessions_ended_after_start check (
    ended_at is null or ended_at >= started_at
  )
);

comment on table public.school_support_sessions is
  'Time-limited platform operator access to a school console for support/review. Not unrestricted by default (ILM-PLT-011).';

create index school_support_sessions_school_id_idx
  on public.school_support_sessions (school_id);
create index school_support_sessions_operator_idx
  on public.school_support_sessions (operator_user_id, ended_at, expires_at);

create trigger school_support_sessions_set_updated_at
before update on public.school_support_sessions
for each row
execute function public.set_updated_at();

create trigger school_support_sessions_reject_school_id_change
before update on public.school_support_sessions
for each row
execute function public.reject_school_id_change();

alter table public.school_support_sessions enable row level security;
alter table public.school_support_sessions force row level security;
revoke all on table public.school_support_sessions from anon, authenticated;
grant select on table public.school_support_sessions to authenticated;

create policy school_support_sessions_select_operator
on public.school_support_sessions
for select
to authenticated
using (public.is_platform_operator());

create or replace function public.has_active_school_support_access(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_operator()
    and exists (
      select 1
      from public.school_support_sessions as s
      where s.school_id = p_school_id
        and s.operator_user_id = (select auth.uid())
        and s.ended_at is null
        and s.expires_at > now()
    );
$$;

comment on function public.has_active_school_support_access(uuid) is
  'True when the current platform operator has an unexpired, open support session for the school.';

revoke all on function public.has_active_school_support_access(uuid) from public;
grant execute on function public.has_active_school_support_access(uuid)
  to authenticated;

-- School manager powers during an active support session (review + operate).
create or replace function public.is_school_manager(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_memberships as m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
  or public.has_active_school_support_access(p_school_id);
$$;

comment on function public.is_school_manager(uuid) is
  'True when the caller is an active school owner/admin, or has an active support session.';

create or replace function public.is_active_school_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_memberships as m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
  or public.has_active_school_support_access(p_school_id);
$$;

comment on function public.is_active_school_member(uuid) is
  'True when the caller has an active membership or an active support session.';

-- ---------------------------------------------------------------------------
-- Staff RPCs: allow platform operators (in addition to school managers)
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
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.can_manage_school_staff(p_school_id) then
    raise exception 'Not authorized to invite to this school'
      using errcode = '42501';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid email is required' using errcode = '22023';
  end if;
  if v_role is null
     or v_role not in ('admin', 'teacher', 'accountant', 'staff') then
    raise exception 'Invalid invitation role' using errcode = '22023';
  end if;
  if v_hours < 1 or v_hours > 720 then
    raise exception 'expires_in_hours must be between 1 and 720'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select m.role into v_actor_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;
  if v_actor_role is null and public.is_platform_operator() then
    v_actor_role := 'platform_operator';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + make_interval(hours => v_hours);

  insert into public.school_invitations (
    school_id, email, role, token_hash, status, invited_by, expires_at
  )
  values (
    p_school_id, v_email, v_role, v_token_hash, 'pending', v_user_id, v_expires_at
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
      'school_id', p_school_id,
      'via_platform', public.is_platform_operator()
        and not public.is_school_manager(p_school_id)
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

revoke all on function public.create_school_invitation(uuid, text, text, integer)
  from public, anon;
grant execute on function public.create_school_invitation(uuid, text, text, integer)
  to authenticated;

create or replace function public.revoke_school_invitation(p_invitation_id uuid)
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
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_inv
  from public.school_invitations
  where id = p_invitation_id
  for update;
  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_school_staff(v_inv.school_id) then
    raise exception 'Not authorized to revoke this invitation'
      using errcode = '42501';
  end if;
  if v_inv.status is distinct from 'pending' then
    raise exception 'Only pending invitations can be revoked'
      using errcode = '22023';
  end if;

  select m.role into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_inv.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;
  if v_actor_role is null and public.is_platform_operator() then
    v_actor_role := 'platform_operator';
  end if;

  update public.school_invitations
  set status = 'revoked', updated_at = now()
  where id = p_invitation_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.invitation.revoked',
    'school_invitation',
    p_invitation_id,
    jsonb_build_object('role', v_inv.role, 'school_id', v_inv.school_id),
    'success',
    v_actor_role,
    v_inv.school_id
  );
end;
$$;

revoke all on function public.revoke_school_invitation(uuid) from public, anon;
grant execute on function public.revoke_school_invitation(uuid) to authenticated;

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
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if v_status is null or v_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid membership status' using errcode = '22023';
  end if;

  select * into v_membership
  from public.school_memberships
  where id = p_membership_id
  for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_school_staff(v_membership.school_id) then
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
    select count(*)::integer into v_active_owners
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

  select m.role into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_membership.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;
  if v_actor_role is null and public.is_platform_operator() then
    v_actor_role := 'platform_operator';
  end if;

  update public.school_memberships
  set status = v_status, updated_at = now()
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

revoke all on function public.set_school_membership_status(uuid, text)
  from public, anon;
grant execute on function public.set_school_membership_status(uuid, text)
  to authenticated;

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
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if v_role is null
     or v_role not in ('admin', 'teacher', 'accountant', 'staff') then
    raise exception 'Invalid membership role' using errcode = '22023';
  end if;

  select * into v_membership
  from public.school_memberships
  where id = p_membership_id
  for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_school_staff(v_membership.school_id) then
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

  select m.role into v_actor_role
  from public.school_memberships as m
  where m.school_id = v_membership.school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;
  if v_actor_role is null and public.is_platform_operator() then
    v_actor_role := 'platform_operator';
  end if;

  update public.school_memberships
  set role = v_role, updated_at = now()
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

-- ---------------------------------------------------------------------------
-- Start / end support sessions
-- ---------------------------------------------------------------------------

create or replace function public.start_school_support_session(
  p_school_id uuid,
  p_reason text,
  p_duration_hours integer default 4
)
returns table (
  session_id uuid,
  school_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reason text := trim(coalesce(p_reason, ''));
  v_hours integer := coalesce(p_duration_hours, 4);
  v_session_id uuid;
  v_expires_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Only platform operators can start support sessions'
      using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.schools as s where s.id = p_school_id) then
    raise exception 'School not found' using errcode = 'P0002';
  end if;
  if length(v_reason) < 8 or length(v_reason) > 500 then
    raise exception 'Enter a support reason (8–500 characters)'
      using errcode = '22023';
  end if;
  if v_hours < 1 or v_hours > 24 then
    raise exception 'Support duration must be between 1 and 24 hours'
      using errcode = '22023';
  end if;

  -- Close any open sessions for this operator+school before opening a new one.
  update public.school_support_sessions as s
  set ended_at = now(), updated_at = now()
  where s.school_id = p_school_id
    and s.operator_user_id = v_user_id
    and s.ended_at is null;

  v_expires_at := now() + make_interval(hours => v_hours);

  insert into public.school_support_sessions (
    school_id, operator_user_id, reason, expires_at
  )
  values (p_school_id, v_user_id, v_reason, v_expires_at)
  returning id into v_session_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'platform.school.support_started',
    'school_support_session',
    v_session_id,
    jsonb_build_object(
      'school_id', p_school_id,
      'expires_at', v_expires_at,
      'duration_hours', v_hours
    ),
    'success',
    'platform_operator',
    p_school_id
  );

  session_id := v_session_id;
  school_id := p_school_id;
  expires_at := v_expires_at;
  return next;
end;
$$;

revoke all on function public.start_school_support_session(uuid, text, integer)
  from public, anon;
grant execute on function public.start_school_support_session(uuid, text, integer)
  to authenticated;

create or replace function public.end_school_support_session(
  p_session_id uuid default null,
  p_school_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.school_support_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Only platform operators can end support sessions'
      using errcode = '42501';
  end if;

  if p_session_id is not null then
    select * into v_session
    from public.school_support_sessions
    where id = p_session_id
    for update;
  elsif p_school_id is not null then
    select * into v_session
    from public.school_support_sessions
    where school_id = p_school_id
      and operator_user_id = v_user_id
      and ended_at is null
    order by started_at desc
    limit 1
    for update;
  else
    raise exception 'session_id or school_id is required'
      using errcode = '22023';
  end if;

  if not found then
    raise exception 'Support session not found' using errcode = 'P0002';
  end if;
  if v_session.operator_user_id is distinct from v_user_id then
    raise exception 'Not authorized to end this support session'
      using errcode = '42501';
  end if;
  if v_session.ended_at is not null then
    return;
  end if;

  update public.school_support_sessions
  set ended_at = now(), updated_at = now()
  where id = v_session.id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'platform.school.support_ended',
    'school_support_session',
    v_session.id,
    jsonb_build_object('school_id', v_session.school_id),
    'success',
    'platform_operator',
    v_session.school_id
  );
end;
$$;

revoke all on function public.end_school_support_session(uuid, uuid)
  from public, anon;
grant execute on function public.end_school_support_session(uuid, uuid)
  to authenticated;
