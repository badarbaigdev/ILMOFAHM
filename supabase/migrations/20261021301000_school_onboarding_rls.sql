-- Phase 2: School onboarding RLS, grants, and authorization helpers
--
-- Principles:
-- - Membership and operator rows are the authority — never client-supplied IDs alone.
-- - Anonymous visitors may insert pending school_applications only.
-- - Public cannot read private applications or set privileged columns.
-- - School users cannot create platform_operators rows.

-- ---------------------------------------------------------------------------
-- Membership helpers
-- ---------------------------------------------------------------------------

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
  );
$$;

comment on function public.is_active_school_member(uuid) is
  'True when the current auth user has an active membership in the school.';

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
  );
$$;

comment on function public.is_school_manager(uuid) is
  'True when the current auth user is an active school owner or admin.';

revoke all on function public.is_active_school_member(uuid) from public;
revoke all on function public.is_school_manager(uuid) from public;
grant execute on function public.is_active_school_member(uuid) to authenticated;
grant execute on function public.is_school_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject school_id reassignment on tenant-owned rows
-- ---------------------------------------------------------------------------

create or replace function public.reject_school_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.school_id is distinct from old.school_id then
    raise exception 'school_id cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger school_campuses_reject_school_id_change
before update on public.school_campuses
for each row
execute function public.reject_school_id_change();

create trigger school_memberships_reject_school_id_change
before update on public.school_memberships
for each row
execute function public.reject_school_id_change();

create trigger school_invitations_reject_school_id_change
before update on public.school_invitations
for each row
execute function public.reject_school_id_change();

-- ---------------------------------------------------------------------------
-- Protect privileged school_applications columns from public/client escalation
-- ---------------------------------------------------------------------------

create or replace function public.protect_school_application_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_operator boolean := public.is_platform_operator();
begin
  if tg_op = 'INSERT' then
    if not v_is_operator then
      -- Force safe public submission shape
      new.status := 'pending';
      new.review_notes := null;
      new.rejection_reason := null;
      new.information_request := null;
      new.reviewer_user_id := null;
      new.provisioned_school_id := null;
      new.reviewed_at := null;
      new.provisioned_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if not v_is_operator then
    raise exception 'Only platform operators may update school applications'
      using errcode = '42501';
  end if;

  if new.provisioned_school_id is distinct from old.provisioned_school_id
     and old.provisioned_school_id is not null then
    raise exception 'provisioned_school_id cannot be changed once set'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger school_applications_protect_privileged_columns
before insert or update on public.school_applications
for each row
execute function public.protect_school_application_privileged_columns();

-- Normalize email/name casing on write
create or replace function public.normalize_school_application_fields()
returns trigger
language plpgsql
as $$
begin
  new.school_name := trim(new.school_name);
  new.applicant_name := trim(new.applicant_name);
  new.applicant_email := lower(trim(new.applicant_email));
  if new.phone is not null then
    new.phone := nullif(trim(new.phone), '');
  end if;
  if new.city is not null then
    new.city := nullif(trim(new.city), '');
  end if;
  if new.country_code is not null then
    new.country_code := upper(trim(new.country_code));
  end if;
  return new;
end;
$$;

create trigger school_applications_normalize_fields
before insert or update on public.school_applications
for each row
execute function public.normalize_school_application_fields();

create or replace function public.normalize_school_invitation_fields()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.token_hash := trim(new.token_hash);
  return new;
end;
$$;

create trigger school_invitations_normalize_fields
before insert or update on public.school_invitations
for each row
execute function public.normalize_school_invitation_fields();

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on table public.schools from anon, authenticated;
revoke all on table public.school_campuses from anon, authenticated;
revoke all on table public.school_memberships from anon, authenticated;
revoke all on table public.school_applications from anon, authenticated;
revoke all on table public.school_invitations from anon, authenticated;

grant select, update on table public.schools to authenticated;
-- insert/delete: service role or future provisioning RPC

grant select, insert, update on table public.school_campuses to authenticated;
-- hard delete reserved for service role / controlled RPC

grant select, insert, update on table public.school_memberships to authenticated;
-- prefer status transitions; no delete grant

grant insert on table public.school_applications to anon, authenticated;
grant select, update on table public.school_applications to authenticated;
-- anon: insert only (pending); no select/update

grant select, insert, update on table public.school_invitations to authenticated;
-- token acceptance via future SECURITY DEFINER RPC

alter table public.schools enable row level security;
alter table public.school_campuses enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_applications enable row level security;
alter table public.school_invitations enable row level security;

alter table public.schools force row level security;
alter table public.school_campuses force row level security;
alter table public.school_memberships force row level security;
alter table public.school_applications force row level security;
alter table public.school_invitations force row level security;

-- ---------------------------------------------------------------------------
-- schools policies
-- ---------------------------------------------------------------------------

drop policy if exists schools_select_member_or_operator on public.schools;
drop policy if exists schools_update_manager on public.schools;

create policy schools_select_member_or_operator
on public.schools
for select
to authenticated
using (
  public.is_active_school_member(id)
  or public.is_platform_operator()
);

create policy schools_update_manager
on public.schools
for update
to authenticated
using (
  public.is_school_manager(id)
  or public.is_platform_operator()
)
with check (
  public.is_school_manager(id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_campuses policies
-- ---------------------------------------------------------------------------

drop policy if exists school_campuses_select_member_or_operator
  on public.school_campuses;
drop policy if exists school_campuses_insert_manager_or_operator
  on public.school_campuses;
drop policy if exists school_campuses_update_manager_or_operator
  on public.school_campuses;

create policy school_campuses_select_member_or_operator
on public.school_campuses
for select
to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

create policy school_campuses_insert_manager_or_operator
on public.school_campuses
for insert
to authenticated
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

create policy school_campuses_update_manager_or_operator
on public.school_campuses
for update
to authenticated
using (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
)
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_memberships policies
-- ---------------------------------------------------------------------------

drop policy if exists school_memberships_select_member_or_operator
  on public.school_memberships;
drop policy if exists school_memberships_insert_manager_or_operator
  on public.school_memberships;
drop policy if exists school_memberships_update_manager_or_operator
  on public.school_memberships;

create policy school_memberships_select_member_or_operator
on public.school_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

create policy school_memberships_insert_manager_or_operator
on public.school_memberships
for insert
to authenticated
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

create policy school_memberships_update_manager_or_operator
on public.school_memberships
for update
to authenticated
using (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
)
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_applications policies
-- ---------------------------------------------------------------------------

drop policy if exists school_applications_insert_public on public.school_applications;
drop policy if exists school_applications_insert_operator on public.school_applications;
drop policy if exists school_applications_select_operator on public.school_applications;
drop policy if exists school_applications_update_operator on public.school_applications;

-- Public (anon + authenticated) may create pending applications only.
-- Privileged columns are forced null/pending by trigger for non-operators.
create policy school_applications_insert_public
on public.school_applications
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewer_user_id is null
  and provisioned_school_id is null
  and reviewed_at is null
  and provisioned_at is null
  and review_notes is null
  and rejection_reason is null
  and information_request is null
);

-- Operators may insert rows in any valid review state (e.g. fixtures / recovery).
create policy school_applications_insert_operator
on public.school_applications
for insert
to authenticated
with check (public.is_platform_operator());

create policy school_applications_select_operator
on public.school_applications
for select
to authenticated
using (public.is_platform_operator());

create policy school_applications_update_operator
on public.school_applications
for update
to authenticated
using (public.is_platform_operator())
with check (public.is_platform_operator());

-- ---------------------------------------------------------------------------
-- school_invitations policies
-- ---------------------------------------------------------------------------

drop policy if exists school_invitations_select_manager_or_operator
  on public.school_invitations;
drop policy if exists school_invitations_insert_manager_or_operator
  on public.school_invitations;
drop policy if exists school_invitations_update_manager_or_operator
  on public.school_invitations;

create policy school_invitations_select_manager_or_operator
on public.school_invitations
for select
to authenticated
using (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

create policy school_invitations_insert_manager_or_operator
on public.school_invitations
for insert
to authenticated
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

create policy school_invitations_update_manager_or_operator
on public.school_invitations
for update
to authenticated
using (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
)
with check (
  public.is_school_manager(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Colleague profile visibility via school memberships
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_school_colleague on public.profiles;

create policy profiles_select_school_colleague
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.school_memberships as viewer
    join public.school_memberships as subject
      on subject.school_id = viewer.school_id
    where viewer.user_id = (select auth.uid())
      and viewer.status = 'active'
      and subject.user_id = profiles.id
      and subject.status in ('invited', 'active', 'suspended')
  )
);

-- ---------------------------------------------------------------------------
-- audit_events: school managers and operators may read school-scoped rows
-- ---------------------------------------------------------------------------

drop policy if exists audit_events_select_school_manager on public.audit_events;

create policy audit_events_select_school_manager
on public.audit_events
for select
to authenticated
using (
  school_id is not null
  and (
    public.is_school_manager(school_id)
    or public.is_platform_operator()
  )
);

-- Extend writer to accept optional school_id without breaking org call sites.
drop function if exists public.write_audit_event(
  uuid, uuid, text, text, uuid, jsonb, text, text
);

create or replace function public.write_audit_event(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_outcome text default 'success',
  p_actor_role text default null,
  p_school_id uuid default null
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
    school_id,
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
    p_school_id,
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

revoke all on function public.write_audit_event(
  uuid, uuid, text, text, uuid, jsonb, text, text, uuid
) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Platform operators: no self-service insert/update/delete via Data API
-- (select already granted; mutations remain service-role / bootstrap only)
-- ---------------------------------------------------------------------------

-- Explicit deny of writes for authenticated on platform_operators is already
-- achieved by lacking INSERT/UPDATE/DELETE grants from prior migration.
