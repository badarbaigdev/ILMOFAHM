-- Phase 11 (slice): School-scoped academic years/terms + grades/sections/subjects
-- Parallel to org academic tables; do not mix FKs across tenancy models.

-- ---------------------------------------------------------------------------
-- Helper: school supports school workflows
-- ---------------------------------------------------------------------------

create or replace function public.school_supports_school_workflows(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.schools as s
    where s.id = p_school_id
      and s.institution_type in ('school', 'both')
  );
$$;

revoke all on function public.school_supports_school_workflows(uuid) from public;
grant execute on function public.school_supports_school_workflows(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- school_academic_years
-- ---------------------------------------------------------------------------

create table public.school_academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned',
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_academic_years_name_not_blank check (length(trim(name)) > 0),
  constraint school_academic_years_date_range check (ends_on >= starts_on),
  constraint school_academic_years_status_valid check (
    status in ('planned', 'active', 'archived')
  ),
  constraint school_academic_years_school_name_unique unique (school_id, name)
);

comment on table public.school_academic_years is
  'Academic year/session for a school tenant.';

create index school_academic_years_school_id_idx
  on public.school_academic_years (school_id);

create unique index school_academic_years_one_current_per_school
  on public.school_academic_years (school_id)
  where is_current;

create trigger school_academic_years_set_updated_at
before update on public.school_academic_years
for each row execute function public.set_updated_at();

create trigger school_academic_years_reject_school_id_change
before update on public.school_academic_years
for each row execute function public.reject_school_id_change();

alter table public.school_academic_years enable row level security;
alter table public.school_academic_years force row level security;
revoke all on table public.school_academic_years from anon, authenticated;
grant select on table public.school_academic_years to authenticated;

create policy school_academic_years_select_member
on public.school_academic_years
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_academic_terms
-- ---------------------------------------------------------------------------

create table public.school_academic_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  academic_year_id uuid not null
    references public.school_academic_years (id)
    on delete restrict,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_academic_terms_name_not_blank check (length(trim(name)) > 0),
  constraint school_academic_terms_date_range check (ends_on >= starts_on),
  constraint school_academic_terms_sort_order_positive check (sort_order >= 1),
  constraint school_academic_terms_year_name_unique unique (academic_year_id, name)
);

comment on table public.school_academic_terms is
  'Optional terms within a school academic year.';

create index school_academic_terms_school_id_idx
  on public.school_academic_terms (school_id);
create index school_academic_terms_year_id_idx
  on public.school_academic_terms (academic_year_id);

create trigger school_academic_terms_set_updated_at
before update on public.school_academic_terms
for each row execute function public.set_updated_at();

create trigger school_academic_terms_reject_school_id_change
before update on public.school_academic_terms
for each row execute function public.reject_school_id_change();

alter table public.school_academic_terms enable row level security;
alter table public.school_academic_terms force row level security;
revoke all on table public.school_academic_terms from anon, authenticated;
grant select on table public.school_academic_terms to authenticated;

create policy school_academic_terms_select_member
on public.school_academic_terms
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_grades / school_sections / school_subjects
-- ---------------------------------------------------------------------------

create table public.school_grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  school_campus_id uuid
    references public.school_campuses (id)
    on delete restrict,
  name text not null,
  code text,
  sort_order integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_grades_name_not_blank check (length(trim(name)) > 0),
  constraint school_grades_sort_order_positive check (sort_order >= 1),
  constraint school_grades_status_valid check (status in ('active', 'archived')),
  constraint school_grades_school_name_unique unique (school_id, name)
);

create index school_grades_school_id_idx on public.school_grades (school_id);

create trigger school_grades_set_updated_at
before update on public.school_grades
for each row execute function public.set_updated_at();

create trigger school_grades_reject_school_id_change
before update on public.school_grades
for each row execute function public.reject_school_id_change();

alter table public.school_grades enable row level security;
alter table public.school_grades force row level security;
revoke all on table public.school_grades from anon, authenticated;
grant select on table public.school_grades to authenticated;

create policy school_grades_select_member
on public.school_grades
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

create table public.school_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  grade_id uuid not null
    references public.school_grades (id)
    on delete restrict,
  school_campus_id uuid
    references public.school_campuses (id)
    on delete restrict,
  name text not null,
  capacity integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_sections_name_not_blank check (length(trim(name)) > 0),
  constraint school_sections_capacity_positive check (
    capacity is null or capacity >= 1
  ),
  constraint school_sections_status_valid check (status in ('active', 'archived')),
  constraint school_sections_grade_name_unique unique (grade_id, name)
);

create index school_sections_school_id_idx on public.school_sections (school_id);
create index school_sections_grade_id_idx on public.school_sections (grade_id);

create trigger school_sections_set_updated_at
before update on public.school_sections
for each row execute function public.set_updated_at();

create trigger school_sections_reject_school_id_change
before update on public.school_sections
for each row execute function public.reject_school_id_change();

alter table public.school_sections enable row level security;
alter table public.school_sections force row level security;
revoke all on table public.school_sections from anon, authenticated;
grant select on table public.school_sections to authenticated;

create policy school_sections_select_member
on public.school_sections
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

create table public.school_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_subjects_name_not_blank check (length(trim(name)) > 0),
  constraint school_subjects_status_valid check (status in ('active', 'archived')),
  constraint school_subjects_school_name_unique unique (school_id, name)
);

create index school_subjects_school_id_idx on public.school_subjects (school_id);

create trigger school_subjects_set_updated_at
before update on public.school_subjects
for each row execute function public.set_updated_at();

create trigger school_subjects_reject_school_id_change
before update on public.school_subjects
for each row execute function public.reject_school_id_change();

alter table public.school_subjects enable row level security;
alter table public.school_subjects force row level security;
revoke all on table public.school_subjects from anon, authenticated;
grant select on table public.school_subjects to authenticated;

create policy school_subjects_select_member
on public.school_subjects
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_academic_year
-- ---------------------------------------------------------------------------

create or replace function public.create_school_academic_year(
  p_school_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_status text default 'planned',
  p_make_current boolean default false
)
returns table (
  academic_year_id uuid,
  school_id uuid,
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
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
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
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  if v_is_current then
    update public.school_academic_years as y
    set is_current = false
    where y.school_id = p_school_id
      and y.is_current;
    if v_status = 'planned' then
      v_status := 'active';
    end if;
  end if;

  insert into public.school_academic_years (
    school_id, name, starts_on, ends_on, status, is_current
  )
  values (
    p_school_id, v_name, p_starts_on, p_ends_on, v_status, v_is_current
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.academic_year.created',
    'school_academic_year',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'status', v_status,
      'is_current', v_is_current
    ),
    'success',
    v_role,
    p_school_id
  );

  academic_year_id := v_id;
  school_id := p_school_id;
  name := v_name;
  status := v_status;
  is_current := v_is_current;
  return next;
end;
$$;

revoke all on function public.create_school_academic_year(
  uuid, text, date, date, text, boolean
) from public, anon;
grant execute on function public.create_school_academic_year(
  uuid, text, date, date, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_academic_year
-- ---------------------------------------------------------------------------

create or replace function public.update_school_academic_year(
  p_academic_year_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_status text,
  p_make_current boolean default null
)
returns table (
  academic_year_id uuid,
  school_id uuid,
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
  v_school_id uuid;
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

  select y.school_id,
         jsonb_build_object(
           'name', y.name,
           'starts_on', y.starts_on,
           'ends_on', y.ends_on,
           'status', y.status,
           'is_current', y.is_current
         )
  into v_school_id, v_old
  from public.school_academic_years as y
  where y.id = p_academic_year_id
  for update;

  if not found then
    raise exception 'Academic year not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage academic years'
      using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  v_make_current := coalesce(p_make_current, (v_old->>'is_current')::boolean);

  if v_make_current then
    update public.school_academic_years as y
    set is_current = false
    where y.school_id = v_school_id
      and y.is_current
      and y.id is distinct from p_academic_year_id;
    if v_status = 'planned' then
      v_status := 'active';
    end if;
  end if;

  update public.school_academic_years as y
  set
    name = v_name,
    starts_on = p_starts_on,
    ends_on = p_ends_on,
    status = v_status,
    is_current = v_make_current
  where y.id = p_academic_year_id;

  select y.name, y.status, y.is_current
  into strict v_new_name, v_new_status, v_new_current
  from public.school_academic_years as y
  where y.id = p_academic_year_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.academic_year.updated',
    'school_academic_year',
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
    v_role,
    v_school_id
  );

  academic_year_id := p_academic_year_id;
  school_id := v_school_id;
  name := v_new_name;
  status := v_new_status;
  is_current := v_new_current;
  return next;
end;
$$;

revoke all on function public.update_school_academic_year(
  uuid, text, date, date, text, boolean
) from public, anon;
grant execute on function public.update_school_academic_year(
  uuid, text, date, date, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_academic_term
-- ---------------------------------------------------------------------------

create or replace function public.create_school_academic_term(
  p_academic_year_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_sort_order integer default 1
)
returns table (
  academic_term_id uuid,
  academic_year_id uuid,
  school_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
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

  select y.school_id, y.starts_on, y.ends_on
  into v_school_id, v_year_start, v_year_end
  from public.school_academic_years as y
  where y.id = p_academic_year_id
  for update;

  if not found then
    raise exception 'Academic year not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage academic terms'
      using errcode = '42501';
  end if;
  if p_starts_on < v_year_start or p_ends_on > v_year_end then
    raise exception 'Term dates must fall within the academic year'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_academic_terms (
    school_id, academic_year_id, name, starts_on, ends_on, sort_order
  )
  values (
    v_school_id, p_academic_year_id, v_name, p_starts_on, p_ends_on, v_sort
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.academic_term.created',
    'school_academic_term',
    v_id,
    jsonb_build_object(
      'academic_year_id', p_academic_year_id,
      'name', v_name,
      'starts_on', p_starts_on,
      'ends_on', p_ends_on,
      'sort_order', v_sort
    ),
    'success',
    v_role,
    v_school_id
  );

  academic_term_id := v_id;
  academic_year_id := p_academic_year_id;
  school_id := v_school_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_school_academic_term(
  uuid, text, date, date, integer
) from public, anon;
grant execute on function public.create_school_academic_term(
  uuid, text, date, date, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_grade / section / subject / archive_grade
-- ---------------------------------------------------------------------------

create or replace function public.create_school_grade(
  p_school_id uuid,
  p_name text,
  p_code text default null,
  p_sort_order integer default 1,
  p_school_campus_id uuid default null
)
returns table (
  grade_id uuid,
  school_id uuid,
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
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage grades' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Grades require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Grade name is required' using errcode = '22023';
  end if;
  if v_sort < 1 then
    raise exception 'sort_order must be >= 1' using errcode = '22023';
  end if;
  if p_school_campus_id is not null then
    if not exists (
      select 1 from public.school_campuses as c
      where c.id = p_school_campus_id
        and c.school_id = p_school_id
    ) then
      raise exception 'Campus not found in this school'
        using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_grades (
    school_id, school_campus_id, name, code, sort_order
  )
  values (
    p_school_id, p_school_campus_id, v_name, v_code, v_sort
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.grade.created',
    'school_grade',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'code', v_code,
      'sort_order', v_sort,
      'school_campus_id', p_school_campus_id
    ),
    'success',
    v_role,
    p_school_id
  );

  grade_id := v_id;
  school_id := p_school_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_school_grade(
  uuid, text, text, integer, uuid
) from public, anon;
grant execute on function public.create_school_grade(
  uuid, text, text, integer, uuid
) to authenticated;

create or replace function public.create_school_section(
  p_grade_id uuid,
  p_name text,
  p_capacity integer default null,
  p_school_campus_id uuid default null
)
returns table (
  section_id uuid,
  grade_id uuid,
  school_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
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

  select g.school_id into v_school_id
  from public.school_grades as g
  where g.id = p_grade_id;

  if not found then
    raise exception 'Grade not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage sections'
      using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(v_school_id) then
    raise exception 'Sections require a school or mixed institution'
      using errcode = '22023';
  end if;
  if p_school_campus_id is not null then
    if not exists (
      select 1 from public.school_campuses as c
      where c.id = p_school_campus_id
        and c.school_id = v_school_id
    ) then
      raise exception 'Campus not found in this school'
        using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_sections (
    school_id, grade_id, school_campus_id, name, capacity
  )
  values (
    v_school_id, p_grade_id, p_school_campus_id, v_name, p_capacity
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.section.created',
    'school_section',
    v_id,
    jsonb_build_object(
      'grade_id', p_grade_id,
      'name', v_name,
      'capacity', p_capacity,
      'school_campus_id', p_school_campus_id
    ),
    'success',
    v_role,
    v_school_id
  );

  section_id := v_id;
  grade_id := p_grade_id;
  school_id := v_school_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_school_section(
  uuid, text, integer, uuid
) from public, anon;
grant execute on function public.create_school_section(
  uuid, text, integer, uuid
) to authenticated;

create or replace function public.create_school_subject(
  p_school_id uuid,
  p_name text,
  p_code text default null
)
returns table (
  subject_id uuid,
  school_id uuid,
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
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage subjects'
      using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Subjects require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Subject name is required' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_subjects (school_id, name, code)
  values (p_school_id, v_name, v_code)
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.subject.created',
    'school_subject',
    v_id,
    jsonb_build_object('name', v_name, 'code', v_code),
    'success',
    v_role,
    p_school_id
  );

  subject_id := v_id;
  school_id := p_school_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_school_subject(uuid, text, text)
  from public, anon;
grant execute on function public.create_school_subject(uuid, text, text)
  to authenticated;

create or replace function public.archive_school_grade(p_grade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_old jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select g.school_id,
         jsonb_build_object('name', g.name, 'status', g.status)
  into v_school_id, v_old
  from public.school_grades as g
  where g.id = p_grade_id
  for update;

  if not found then
    raise exception 'Grade not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage grades' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_grades set status = 'archived' where id = p_grade_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.grade.archived',
    'school_grade',
    p_grade_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object('name', v_old->>'name', 'status', 'archived')
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.archive_school_grade(uuid) from public, anon;
grant execute on function public.archive_school_grade(uuid) to authenticated;
