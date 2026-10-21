-- Phase 3: Controlled platform operator bootstrap + status changes
--
-- First active operator may self-bootstrap only while none exist.
-- After that, bootstrap is permanently denied at the database.
-- Status changes (suspend/revoke/reactivate) require an active operator,
-- are audited, and cannot remove the last active operator.

-- ---------------------------------------------------------------------------
-- Availability probe (no privilege escalation)
-- ---------------------------------------------------------------------------

create or replace function public.platform_bootstrap_available()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.platform_operators as po
    where po.status = 'active'
  );
$$;

comment on function public.platform_bootstrap_available() is
  'True only when no active platform operator exists (bootstrap window open).';

revoke all on function public.platform_bootstrap_available() from public;
grant execute on function public.platform_bootstrap_available() to authenticated;

-- ---------------------------------------------------------------------------
-- First-operator bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_first_platform_operator()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.platform_operators as po
    where po.status = 'active'
  ) then
    raise exception 'Platform bootstrap is disabled: an active operator already exists'
      using errcode = '42501';
  end if;

  -- Ensure profile row exists (Auth user must already be present).
  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select po.user_id
  into v_existing
  from public.platform_operators as po
  where po.user_id = v_user_id;

  if v_existing is not null then
    update public.platform_operators
    set status = 'active',
        role = 'operator',
        updated_at = now()
    where user_id = v_user_id
      and status is distinct from 'active';
  else
    insert into public.platform_operators (user_id, role, status)
    values (v_user_id, 'operator', 'active');
  end if;

  perform public.write_audit_event(
    null,
    v_user_id,
    'platform.operator.bootstrap',
    'platform_operator',
    v_user_id,
    jsonb_build_object('via', 'bootstrap_first_platform_operator'),
    'success',
    'operator',
    null
  );

  return v_user_id;
end;
$$;

comment on function public.bootstrap_first_platform_operator() is
  'Promotes the current Auth user to the first active platform operator. Fails closed once any active operator exists.';

revoke all on function public.bootstrap_first_platform_operator() from public;
grant execute on function public.bootstrap_first_platform_operator() to authenticated;

-- ---------------------------------------------------------------------------
-- Operator status changes (suspend / revoke / reactivate)
-- ---------------------------------------------------------------------------

create or replace function public.set_platform_operator_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_status text := nullif(trim(p_status), '');
  v_active_count integer;
  v_target_status text;
begin
  if v_actor is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_platform_operator() then
    raise exception 'Not authorized as platform operator'
      using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required'
      using errcode = '22023';
  end if;

  if v_status is null or v_status not in ('active', 'suspended', 'revoked') then
    raise exception 'Invalid operator status'
      using errcode = '22023';
  end if;

  select po.status
  into v_target_status
  from public.platform_operators as po
  where po.user_id = p_user_id;

  if v_target_status is null then
    raise exception 'Platform operator not found'
      using errcode = 'P0002';
  end if;

  if v_target_status = v_status then
    return;
  end if;

  if v_status <> 'active' then
    select count(*)::integer
    into v_active_count
    from public.platform_operators as po
    where po.status = 'active';

    if v_target_status = 'active' and v_active_count <= 1 then
      raise exception 'Cannot suspend or revoke the last active platform operator'
        using errcode = 'P0001';
    end if;
  end if;

  update public.platform_operators
  set status = v_status,
      updated_at = now()
  where user_id = p_user_id;

  perform public.write_audit_event(
    null,
    v_actor,
    'platform.operator.status_change',
    'platform_operator',
    p_user_id,
    jsonb_build_object(
      'from_status', v_target_status,
      'to_status', v_status
    ),
    'success',
    'operator',
    null
  );
end;
$$;

comment on function public.set_platform_operator_status(uuid, text) is
  'Active operators may suspend, revoke, or reactivate operators. The last active operator cannot be removed.';

revoke all on function public.set_platform_operator_status(uuid, text) from public;
grant execute on function public.set_platform_operator_status(uuid, text)
  to authenticated;
