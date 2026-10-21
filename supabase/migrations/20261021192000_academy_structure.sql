-- ILM-ACA-003: Academy structure — courses and cohorts/batches
--
-- Only meaningful for academy / both institutions. RPCs refuse school-only orgs.
-- Enrollment of students is deferred to M3.

-- ---------------------------------------------------------------------------
-- Helper: org must support academy workflows
-- ---------------------------------------------------------------------------

create or replace function public.org_supports_academy(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations as o
    where o.id = p_organization_id
      and o.institution_type in ('academy', 'both')
  );
$$;

revoke all on function public.org_supports_academy(uuid) from public;
grant execute on function public.org_supports_academy(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  campus_id uuid
    references public.campuses (id)
    on delete restrict,
  name text not null,
  code text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_name_not_blank check (length(trim(name)) > 0),
  constraint courses_status_valid check (status in ('active', 'archived')),
  constraint courses_org_name_unique unique (organization_id, name)
);

comment on table public.courses is
  'Academy course catalogue entries.';

create index courses_organization_id_idx on public.courses (organization_id);
create index courses_campus_id_idx on public.courses (campus_id);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger courses_reject_organization_id_change
before update on public.courses
for each row execute function public.reject_organization_id_change();

alter table public.courses enable row level security;
alter table public.courses force row level security;

revoke all on table public.courses from anon, authenticated;
grant select on table public.courses to authenticated;

create policy courses_select_member
on public.courses
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- cohorts (batches)
-- ---------------------------------------------------------------------------

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  course_id uuid not null
    references public.courses (id)
    on delete restrict,
  campus_id uuid
    references public.campuses (id)
    on delete restrict,
  academic_year_id uuid
    references public.academic_years (id)
    on delete restrict,
  name text not null,
  starts_on date,
  ends_on date,
  capacity integer,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cohorts_name_not_blank check (length(trim(name)) > 0),
  constraint cohorts_date_range check (
    starts_on is null
    or ends_on is null
    or ends_on >= starts_on
  ),
  constraint cohorts_capacity_positive check (
    capacity is null or capacity >= 1
  ),
  constraint cohorts_status_valid check (
    status in ('planned', 'active', 'completed', 'archived')
  ),
  constraint cohorts_course_name_unique unique (course_id, name)
);

comment on table public.cohorts is
  'Academy batches/cohorts within a course. Capacity and dates optional.';

create index cohorts_organization_id_idx on public.cohorts (organization_id);
create index cohorts_course_id_idx on public.cohorts (course_id);
create index cohorts_academic_year_id_idx on public.cohorts (academic_year_id);

create trigger cohorts_set_updated_at
before update on public.cohorts
for each row execute function public.set_updated_at();

create trigger cohorts_reject_organization_id_change
before update on public.cohorts
for each row execute function public.reject_organization_id_change();

alter table public.cohorts enable row level security;
alter table public.cohorts force row level security;

revoke all on table public.cohorts from anon, authenticated;
grant select on table public.cohorts to authenticated;

create policy cohorts_select_member
on public.cohorts
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- create_course
-- ---------------------------------------------------------------------------

create or replace function public.create_course(
  p_organization_id uuid,
  p_name text,
  p_code text default null,
  p_description text default null,
  p_campus_id uuid default null
)
returns table (
  course_id uuid,
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
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_description text := nullif(trim(p_description), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '22023';
  end if;
  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to manage courses'
      using errcode = '42501';
  end if;
  if not public.org_supports_academy(p_organization_id) then
    raise exception 'Courses require an academy or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Course name is required' using errcode = '22023';
  end if;
  if p_campus_id is not null then
    if not exists (
      select 1 from public.campuses as c
      where c.id = p_campus_id
        and c.organization_id = p_organization_id
    ) then
      raise exception 'Campus not found in this organization'
        using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.courses (
    organization_id, campus_id, name, code, description
  )
  values (
    p_organization_id, p_campus_id, v_name, v_code, v_description
  )
  returning id into v_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'course.created',
    'course',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'code', v_code,
      'campus_id', p_campus_id
    ),
    'success',
    v_role
  );

  course_id := v_id;
  organization_id := p_organization_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_course(
  uuid, text, text, text, uuid
) from public, anon;
grant execute on function public.create_course(
  uuid, text, text, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_cohort
-- ---------------------------------------------------------------------------

create or replace function public.create_cohort(
  p_course_id uuid,
  p_name text,
  p_starts_on date default null,
  p_ends_on date default null,
  p_capacity integer default null,
  p_academic_year_id uuid default null,
  p_campus_id uuid default null,
  p_status text default 'planned'
)
returns table (
  cohort_id uuid,
  course_id uuid,
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
  v_name text := nullif(trim(p_name), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'planned');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_course_id is null then
    raise exception 'course_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Cohort name is required' using errcode = '22023';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be >= 1' using errcode = '22023';
  end if;
  if p_starts_on is not null
     and p_ends_on is not null
     and p_ends_on < p_starts_on then
    raise exception 'End date must be on or after start date'
      using errcode = '22023';
  end if;
  if v_status not in ('planned', 'active', 'completed', 'archived') then
    raise exception 'Invalid cohort status' using errcode = '22023';
  end if;

  select c.organization_id into v_org_id
  from public.courses as c
  where c.id = p_course_id;

  if not found then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage cohorts'
      using errcode = '42501';
  end if;
  if not public.org_supports_academy(v_org_id) then
    raise exception 'Cohorts require an academy or mixed institution'
      using errcode = '22023';
  end if;
  if p_academic_year_id is not null then
    if not exists (
      select 1 from public.academic_years as y
      where y.id = p_academic_year_id
        and y.organization_id = v_org_id
    ) then
      raise exception 'Academic year not found in this organization'
        using errcode = 'P0002';
    end if;
  end if;
  if p_campus_id is not null then
    if not exists (
      select 1 from public.campuses as c
      where c.id = p_campus_id
        and c.organization_id = v_org_id
    ) then
      raise exception 'Campus not found in this organization'
        using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.cohorts (
    organization_id,
    course_id,
    campus_id,
    academic_year_id,
    name,
    starts_on,
    ends_on,
    capacity,
    status
  )
  values (
    v_org_id,
    p_course_id,
    p_campus_id,
    p_academic_year_id,
    v_name,
    p_starts_on,
    p_ends_on,
    p_capacity,
    v_status
  )
  returning id into v_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'cohort.created',
    'cohort',
    v_id,
    jsonb_build_object(
      'course_id', p_course_id,
      'name', v_name,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'capacity', p_capacity,
      'status', v_status,
      'academic_year_id', p_academic_year_id,
      'campus_id', p_campus_id
    ),
    'success',
    v_role
  );

  cohort_id := v_id;
  course_id := p_course_id;
  organization_id := v_org_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_cohort(
  uuid, text, date, date, integer, uuid, uuid, text
) from public, anon;
grant execute on function public.create_cohort(
  uuid, text, date, date, integer, uuid, uuid, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_course
-- ---------------------------------------------------------------------------

create or replace function public.archive_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_org_id uuid;
  v_old jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select c.organization_id,
         jsonb_build_object('name', c.name, 'status', c.status)
  into v_org_id, v_old
  from public.courses as c
  where c.id = p_course_id
  for update;

  if not found then
    raise exception 'Course not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage courses'
      using errcode = '42501';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.courses set status = 'archived' where id = p_course_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'course.archived',
    'course',
    p_course_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object('name', v_old->>'name', 'status', 'archived')
    ),
    'success',
    v_role
  );
end;
$$;

revoke all on function public.archive_course(uuid) from public, anon;
grant execute on function public.archive_course(uuid) to authenticated;
