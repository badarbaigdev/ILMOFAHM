-- ILM-PLAT-002: Least-privilege grants and RLS for tenant foundation
--
-- Policies use active organization_memberships as the authority.
-- Profiles never grant school access by themselves.
-- Organization/campus reassignment is blocked by triggers.
-- Automated allow/deny SQL tests arrive in ILM-PLAT-003.
-- Organization bootstrap insert for first owners arrives in ILM-PLAT-005 (RPC).

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------

create or replace function public.is_active_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships as m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

comment on function public.is_active_org_member(uuid) is
  'True when the current auth user has an active membership in the organization.';

create or replace function public.is_org_manager(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships as m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

comment on function public.is_org_manager(uuid) is
  'True when the current auth user is an active owner or admin of the organization.';

revoke all on function public.is_active_org_member(uuid) from public;
revoke all on function public.is_org_manager(uuid) from public;
grant execute on function public.is_active_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reject tenant ownership reassignment
-- ---------------------------------------------------------------------------

create or replace function public.reject_organization_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger campuses_reject_organization_id_change
before update on public.campuses
for each row
execute function public.reject_organization_id_change();

create trigger organization_memberships_reject_organization_id_change
before update on public.organization_memberships
for each row
execute function public.reject_organization_id_change();

-- ---------------------------------------------------------------------------
-- Least-privilege table grants (anon stays fully revoked)
-- ---------------------------------------------------------------------------

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.campuses from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;

grant select, update on table public.organizations to authenticated;
-- insert/delete: service role or future onboarding RPC (ILM-PLAT-005)

grant select, insert, update, delete on table public.campuses to authenticated;

grant select, insert, update on table public.profiles to authenticated;
-- delete: cascade from auth.users; no direct client delete

grant select, insert, update on table public.organization_memberships to authenticated;
-- prefer status transitions over hard deletes; no delete grant

-- Ensure RLS remains on (already enabled in ILM-PLAT-001)
alter table public.organizations enable row level security;
alter table public.campuses enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;

alter table public.organizations force row level security;
alter table public.campuses force row level security;
alter table public.profiles force row level security;
alter table public.organization_memberships force row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

drop policy if exists organizations_select_member on public.organizations;
drop policy if exists organizations_update_manager on public.organizations;

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (public.is_active_org_member(id));

create policy organizations_update_manager
on public.organizations
for update
to authenticated
using (public.is_org_manager(id))
with check (public.is_org_manager(id));

-- No insert/delete policies for authenticated: first-owner provisioning is ILM-PLAT-005.

-- ---------------------------------------------------------------------------
-- campuses
-- ---------------------------------------------------------------------------

drop policy if exists campuses_select_member on public.campuses;
drop policy if exists campuses_insert_manager on public.campuses;
drop policy if exists campuses_update_manager on public.campuses;
drop policy if exists campuses_delete_manager on public.campuses;

create policy campuses_select_member
on public.campuses
for select
to authenticated
using (public.is_active_org_member(organization_id));

create policy campuses_insert_manager
on public.campuses
for insert
to authenticated
with check (public.is_org_manager(organization_id));

create policy campuses_update_manager
on public.campuses
for update
to authenticated
using (public.is_org_manager(organization_id))
with check (public.is_org_manager(organization_id));

create policy campuses_delete_manager
on public.campuses
for delete
to authenticated
using (public.is_org_manager(organization_id));

-- ---------------------------------------------------------------------------
-- organization_memberships
-- ---------------------------------------------------------------------------

drop policy if exists organization_memberships_select_self_or_member
  on public.organization_memberships;
drop policy if exists organization_memberships_insert_manager
  on public.organization_memberships;
drop policy if exists organization_memberships_update_manager
  on public.organization_memberships;

create policy organization_memberships_select_self_or_member
on public.organization_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_active_org_member(organization_id)
);

create policy organization_memberships_insert_manager
on public.organization_memberships
for insert
to authenticated
with check (public.is_org_manager(organization_id));

create policy organization_memberships_update_manager
on public.organization_memberships
for update
to authenticated
using (public.is_org_manager(organization_id))
with check (public.is_org_manager(organization_id));
