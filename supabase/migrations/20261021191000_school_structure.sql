-- ILM-ACA-002: School structure — grades, sections, subjects
--
-- Only meaningful for school / both institutions. RPCs refuse academy-only orgs.
-- Teacher assignment links are deferred until staff assignment workflows land.

-- ---------------------------------------------------------------------------
-- Helper: org must support school workflows
-- ---------------------------------------------------------------------------

create or replace function public.org_supports_school(p_organization_id uuid)
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
      and o.institution_type in ('school', 'both')
  );
$$;

revoke all on function public.org_supports_school(uuid) from public;
grant execute on function public.org_supports_school(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- grades
-- ---------------------------------------------------------------------------

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  campus_id uuid
    references public.campuses (id)
    on delete restrict,
  name text not null,
  code text,
  sort_order integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_name_not_blank check (length(trim(name)) > 0),
  constraint grades_sort_order_positive check (sort_order >= 1),
  constraint grades_status_valid check (status in ('active', 'archived')),
  constraint grades_org_name_unique unique (organization_id, name)
);

comment on table public.grades is
  'School grade/class levels (e.g. Grade 5). Optional campus scope.';

create index grades_organization_id_idx on public.grades (organization_id);
create index grades_campus_id_idx on public.grades (campus_id);

create trigger grades_set_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

create trigger grades_reject_organization_id_change
before update on public.grades
for each row execute function public.reject_organization_id_change();

alter table public.grades enable row level security;
alter table public.grades force row level security;

revoke all on table public.grades from anon, authenticated;
grant select on table public.grades to authenticated;

create policy grades_select_member
on public.grades
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  grade_id uuid not null
    references public.grades (id)
    on delete restrict,
  campus_id uuid
    references public.campuses (id)
    on delete restrict,
  name text not null,
  capacity integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sections_name_not_blank check (length(trim(name)) > 0),
  constraint sections_capacity_positive check (
    capacity is null or capacity >= 1
  ),
  constraint sections_status_valid check (status in ('active', 'archived')),
  constraint sections_grade_name_unique unique (grade_id, name)
);

comment on table public.sections is
  'Sections within a grade (e.g. 5-A). Capacity optional.';

create index sections_organization_id_idx on public.sections (organization_id);
create index sections_grade_id_idx on public.sections (grade_id);

create trigger sections_set_updated_at
before update on public.sections
for each row execute function public.set_updated_at();

create trigger sections_reject_organization_id_change
before update on public.sections
for each row execute function public.reject_organization_id_change();

alter table public.sections enable row level security;
alter table public.sections force row level security;

revoke all on table public.sections from anon, authenticated;
grant select on table public.sections to authenticated;

create policy sections_select_member
on public.sections
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  name text not null,
  code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_not_blank check (length(trim(name)) > 0),
  constraint subjects_status_valid check (status in ('active', 'archived')),
  constraint subjects_org_name_unique unique (organization_id, name)
);

comment on table public.subjects is
  'Subject catalogue for school workflows (e.g. Mathematics).';

create index subjects_organization_id_idx on public.subjects (organization_id);

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

create trigger subjects_reject_organization_id_change
before update on public.subjects
for each row execute function public.reject_organization_id_change();

alter table public.subjects enable row level security;
alter table public.subjects force row level security;

revoke all on table public.subjects from anon, authenticated;
grant select on table public.subjects to authenticated;

create policy subjects_select_member
on public.subjects
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- create_grade
-- ---------------------------------------------------------------------------

create or replace function public.create_grade(
  p_organization_id uuid,
  p_name text,
  p_code text default null,
  p_sort_order integer default 1,
  p_campus_id uuid default null
)
returns table (
  grade_id uuid,
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
  v_sort integer := coalesce(p_sort_order, 1);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '22023';
  end if;
  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to manage grades' using errcode = '42501';
  end if;
  if not public.org_supports_school(p_organization_id) then
    raise exception 'Grades require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Grade name is required' using errcode = '22023';
  end if;
  if v_sort < 1 then
    raise exception 'sort_order must be >= 1' using errcode = '22023';
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

  insert into public.grades (
    organization_id, campus_id, name, code, sort_order
  )
  values (
    p_organization_id, p_campus_id, v_name, v_code, v_sort
  )
  returning id into v_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'grade.created',
    'grade',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'code', v_code,
      'sort_order', v_sort,
      'campus_id', p_campus_id
    ),
    'success',
    v_role
  );

  grade_id := v_id;
  organization_id := p_organization_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_grade(
  uuid, text, text, integer, uuid
) from public, anon;
grant execute on function public.create_grade(
  uuid, text, text, integer, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_section
-- ---------------------------------------------------------------------------

create or replace function public.create_section(
  p_grade_id uuid,
  p_name text,
  p_capacity integer default null,
  p_campus_id uuid default null
)
returns table (
  section_id uuid,
  grade_id uuid,
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
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_grade_id is null then
    raise exception 'grade_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Section name is required' using errcode = '22023';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be >= 1' using errcode = '22023';
  end if;

  select g.organization_id into v_org_id
  from public.grades as g
  where g.id = p_grade_id;

  if not found then
    raise exception 'Grade not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage sections'
      using errcode = '42501';
  end if;
  if not public.org_supports_school(v_org_id) then
    raise exception 'Sections require a school or mixed institution'
      using errcode = '22023';
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

  insert into public.sections (
    organization_id, grade_id, campus_id, name, capacity
  )
  values (
    v_org_id, p_grade_id, p_campus_id, v_name, p_capacity
  )
  returning id into v_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'section.created',
    'section',
    v_id,
    jsonb_build_object(
      'grade_id', p_grade_id,
      'name', v_name,
      'capacity', p_capacity,
      'campus_id', p_campus_id
    ),
    'success',
    v_role
  );

  section_id := v_id;
  grade_id := p_grade_id;
  organization_id := v_org_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_section(
  uuid, text, integer, uuid
) from public, anon;
grant execute on function public.create_section(
  uuid, text, integer, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_subject
-- ---------------------------------------------------------------------------

create or replace function public.create_subject(
  p_organization_id uuid,
  p_name text,
  p_code text default null
)
returns table (
  subject_id uuid,
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
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_organization_id is null then
    raise exception 'organization_id is required' using errcode = '22023';
  end if;
  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to manage subjects'
      using errcode = '42501';
  end if;
  if not public.org_supports_school(p_organization_id) then
    raise exception 'Subjects require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Subject name is required' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.subjects (organization_id, name, code)
  values (p_organization_id, v_name, v_code)
  returning id into v_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'subject.created',
    'subject',
    v_id,
    jsonb_build_object('name', v_name, 'code', v_code),
    'success',
    v_role
  );

  subject_id := v_id;
  organization_id := p_organization_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_subject(uuid, text, text)
  from public, anon;
grant execute on function public.create_subject(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- archive helpers (soft archive — preserve historical references)
-- ---------------------------------------------------------------------------

create or replace function public.archive_grade(p_grade_id uuid)
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

  select g.organization_id,
         jsonb_build_object('name', g.name, 'status', g.status)
  into v_org_id, v_old
  from public.grades as g
  where g.id = p_grade_id
  for update;

  if not found then
    raise exception 'Grade not found' using errcode = 'P0002';
  end if;
  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage grades' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.grades set status = 'archived' where id = p_grade_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'grade.archived',
    'grade',
    p_grade_id,
    jsonb_build_object('before', v_old, 'after', jsonb_build_object(
      'name', v_old->>'name', 'status', 'archived'
    )),
    'success',
    v_role
  );
end;
$$;

revoke all on function public.archive_grade(uuid) from public, anon;
grant execute on function public.archive_grade(uuid) to authenticated;
