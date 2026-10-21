-- ILM-ACA-001: Academic years and terms
--
-- Organization-scoped academic calendar foundation. School and academy modules
-- both reference academic years; terms are optional subdivisions within a year.

-- ---------------------------------------------------------------------------
-- academic_years
-- ---------------------------------------------------------------------------

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned',
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_name_not_blank check (length(trim(name)) > 0),
  constraint academic_years_date_range check (ends_on >= starts_on),
  constraint academic_years_status_valid check (
    status in ('planned', 'active', 'archived')
  ),
  constraint academic_years_org_name_unique unique (organization_id, name)
);

comment on table public.academic_years is
  'Academic year/session for an organization. Used by school and academy workflows.';

create index academic_years_organization_id_idx
  on public.academic_years (organization_id);

create unique index academic_years_one_current_per_org
  on public.academic_years (organization_id)
  where is_current;

create trigger academic_years_set_updated_at
before update on public.academic_years
for each row
execute function public.set_updated_at();

create trigger academic_years_reject_organization_id_change
before update on public.academic_years
for each row
execute function public.reject_organization_id_change();

alter table public.academic_years enable row level security;
alter table public.academic_years force row level security;

revoke all on table public.academic_years from anon, authenticated;
grant select on table public.academic_years to authenticated;

create policy academic_years_select_member
on public.academic_years
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- academic_terms
-- ---------------------------------------------------------------------------

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  academic_year_id uuid not null
    references public.academic_years (id)
    on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_terms_name_not_blank check (length(trim(name)) > 0),
  constraint academic_terms_date_range check (ends_on >= starts_on),
  constraint academic_terms_sort_order_positive check (sort_order >= 1),
  constraint academic_terms_year_name_unique unique (academic_year_id, name)
);

comment on table public.academic_terms is
  'Optional terms within an academic year (e.g. Term 1, Fall semester).';

create index academic_terms_organization_id_idx
  on public.academic_terms (organization_id);

create index academic_terms_academic_year_id_idx
  on public.academic_terms (academic_year_id);

create trigger academic_terms_set_updated_at
before update on public.academic_terms
for each row
execute function public.set_updated_at();

create trigger academic_terms_reject_organization_id_change
before update on public.academic_terms
for each row
execute function public.reject_organization_id_change();

alter table public.academic_terms enable row level security;
alter table public.academic_terms force row level security;

revoke all on table public.academic_terms from anon, authenticated;
grant select on table public.academic_terms to authenticated;

create policy academic_terms_select_member
on public.academic_terms
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- create_academic_year
-- ---------------------------------------------------------------------------

create or replace function public.create_academic_year(
  p_organization_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_status text default 'planned',
  p_make_current boolean default false
)
returns table (
  academic_year_id uuid,
  organization_id uuid,
  name text,
  status text,
  is_current boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'planned');
  v_id uuid;
  v_is_current boolean := coalesce(p_make_current, false);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '22023';
  end if;
  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to manage academic years'
      using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Academic year name is required' using errcode = '22023';
  end if;
  if p_starts_on is null or p_ends_on is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;
  if p_ends_on < p_starts_on then
    raise exception 'End date must be on or after start date'
      using errcode = '22023';
  end if;
  if v_status not in ('planned', 'active', 'archived') then
    raise exception 'Invalid academic year status' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  if v_is_current then
    update public.academic_years as y
    set is_current = false
    where y.organization_id = p_organization_id
      and y.is_current;
    if v_status = 'planned' then
      v_status := 'active';
    end if;
  end if;

  insert into public.academic_years (
    organization_id, name, starts_on, ends_on, status, is_current
  )
  values (
    p_organization_id, v_name, p_starts_on, p_ends_on, v_status, v_is_current
  )
  returning id into v_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'academic_year.created',
    'academic_year',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'status', v_status,
      'is_current', v_is_current
    ),
    'success',
    v_role
  );

  academic_year_id := v_id;
  organization_id := p_organization_id;
  name := v_name;
  status := v_status;
  is_current := v_is_current;
  return next;
end;
$$;

revoke all on function public.create_academic_year(
  uuid, text, date, date, text, boolean
) from public, anon;
grant execute on function public.create_academic_year(
  uuid, text, date, date, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_academic_year
-- ---------------------------------------------------------------------------

create or replace function public.update_academic_year(
  p_academic_year_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_status text,
  p_make_current boolean default null
)
returns table (
  academic_year_id uuid,
  organization_id uuid,
  name text,
  status text,
  is_current boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_org_id uuid;
  v_name text := nullif(trim(p_name), '');
  v_status text := nullif(trim(p_status), '');
  v_old jsonb;
  v_new_name text;
  v_new_status text;
  v_new_current boolean;
  v_make_current boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_academic_year_id is null then
    raise exception 'academic_year_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Academic year name is required' using errcode = '22023';
  end if;
  if p_starts_on is null or p_ends_on is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;
  if p_ends_on < p_starts_on then
    raise exception 'End date must be on or after start date'
      using errcode = '22023';
  end if;
  if v_status is null or v_status not in ('planned', 'active', 'archived') then
    raise exception 'Invalid academic year status' using errcode = '22023';
  end if;

  select y.organization_id,
         jsonb_build_object(
           'name', y.name,
           'starts_on', y.starts_on,
           'ends_on', y.ends_on,
           'status', y.status,
           'is_current', y.is_current
         )
  into v_org_id, v_old
  from public.academic_years as y
  where y.id = p_academic_year_id
  for update;

  if not found then
    raise exception 'Academic year not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage academic years'
      using errcode = '42501';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  v_make_current := coalesce(p_make_current, (v_old->>'is_current')::boolean);

  if v_make_current then
    update public.academic_years as y
    set is_current = false
    where y.organization_id = v_org_id
      and y.is_current
      and y.id is distinct from p_academic_year_id;
    if v_status = 'planned' then
      v_status := 'active';
    end if;
  end if;

  update public.academic_years as y
  set
    name = v_name,
    starts_on = p_starts_on,
    ends_on = p_ends_on,
    status = v_status,
    is_current = v_make_current
  where y.id = p_academic_year_id;

  select y.name, y.status, y.is_current
  into strict v_new_name, v_new_status, v_new_current
  from public.academic_years as y
  where y.id = p_academic_year_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'academic_year.updated',
    'academic_year',
    p_academic_year_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_new_name,
        'starts_on', p_starts_on,
        'ends_on', p_ends_on,
        'status', v_new_status,
        'is_current', v_new_current
      )
    ),
    'success',
    v_role
  );

  academic_year_id := p_academic_year_id;
  organization_id := v_org_id;
  name := v_new_name;
  status := v_new_status;
  is_current := v_new_current;
  return next;
end;
$$;

revoke all on function public.update_academic_year(
  uuid, text, date, date, text, boolean
) from public, anon;
grant execute on function public.update_academic_year(
  uuid, text, date, date, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_academic_term
-- ---------------------------------------------------------------------------

create or replace function public.create_academic_term(
  p_academic_year_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_sort_order integer default 1
)
returns table (
  academic_term_id uuid,
  academic_year_id uuid,
  organization_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_org_id uuid;
  v_year_start date;
  v_year_end date;
  v_name text := nullif(trim(p_name), '');
  v_sort integer := coalesce(p_sort_order, 1);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_academic_year_id is null then
    raise exception 'academic_year_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Term name is required' using errcode = '22023';
  end if;
  if p_starts_on is null or p_ends_on is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;
  if p_ends_on < p_starts_on then
    raise exception 'End date must be on or after start date'
      using errcode = '22023';
  end if;
  if v_sort < 1 then
    raise exception 'sort_order must be >= 1' using errcode = '22023';
  end if;

  select y.organization_id, y.starts_on, y.ends_on
  into v_org_id, v_year_start, v_year_end
  from public.academic_years as y
  where y.id = p_academic_year_id;

  if not found then
    raise exception 'Academic year not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage academic terms'
      using errcode = '42501';
  end if;
  if p_starts_on < v_year_start or p_ends_on > v_year_end then
    raise exception 'Term dates must fall within the academic year'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.academic_terms (
    organization_id,
    academic_year_id,
    name,
    starts_on,
    ends_on,
    sort_order
  )
  values (
    v_org_id,
    p_academic_year_id,
    v_name,
    p_starts_on,
    p_ends_on,
    v_sort
  )
  returning id into v_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'academic_term.created',
    'academic_term',
    v_id,
    jsonb_build_object(
      'academic_year_id', p_academic_year_id,
      'name', v_name,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'sort_order', v_sort
    ),
    'success',
    v_role
  );

  academic_term_id := v_id;
  academic_year_id := p_academic_year_id;
  organization_id := v_org_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_academic_term(
  uuid, text, date, date, integer
) from public, anon;
grant execute on function public.create_academic_term(
  uuid, text, date, date, integer
) to authenticated;
