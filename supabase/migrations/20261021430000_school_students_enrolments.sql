-- Phase 11 continued: school students + academic-year enrolments
-- Manual create only. No guardians, import, attendance, or fees.

-- ---------------------------------------------------------------------------
-- school_students
-- ---------------------------------------------------------------------------

create table public.school_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  school_campus_id uuid
    references public.school_campuses (id)
    on delete restrict,
  student_number text not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_students_number_not_blank
    check (length(trim(student_number)) > 0),
  constraint school_students_first_name_not_blank
    check (length(trim(first_name)) > 0),
  constraint school_students_last_name_not_blank
    check (length(trim(last_name)) > 0),
  constraint school_students_gender_valid check (
    gender is null or gender in ('female', 'male', 'other', 'unspecified')
  ),
  constraint school_students_status_valid check (
    status in ('active', 'withdrawn', 'archived')
  ),
  constraint school_students_school_number_unique unique (school_id, student_number)
);

comment on table public.school_students is
  'Student records scoped to a school tenant (synthetic/manual entry for now).';

create index school_students_school_id_idx on public.school_students (school_id);
create index school_students_school_status_idx
  on public.school_students (school_id, status);

create trigger school_students_set_updated_at
before update on public.school_students
for each row execute function public.set_updated_at();

create trigger school_students_reject_school_id_change
before update on public.school_students
for each row execute function public.reject_school_id_change();

alter table public.school_students enable row level security;
alter table public.school_students force row level security;
revoke all on table public.school_students from anon, authenticated;
grant select on table public.school_students to authenticated;

create policy school_students_select_member
on public.school_students
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_enrolments
-- ---------------------------------------------------------------------------

create table public.school_enrolments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  student_id uuid not null
    references public.school_students (id)
    on delete restrict,
  academic_year_id uuid not null
    references public.school_academic_years (id)
    on delete restrict,
  grade_id uuid not null
    references public.school_grades (id)
    on delete restrict,
  section_id uuid
    references public.school_sections (id)
    on delete restrict,
  status text not null default 'enrolled',
  enrolled_on date not null default (current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_enrolments_status_valid check (
    status in ('enrolled', 'withdrawn', 'transferred')
  )
);

comment on table public.school_enrolments is
  'Student placement in a grade/section for a school academic year.';

create index school_enrolments_school_id_idx on public.school_enrolments (school_id);
create index school_enrolments_student_id_idx on public.school_enrolments (student_id);
create index school_enrolments_year_id_idx
  on public.school_enrolments (academic_year_id);

-- One active enrolment per student per academic year
create unique index school_enrolments_one_active_per_year
  on public.school_enrolments (student_id, academic_year_id)
  where status = 'enrolled';

create trigger school_enrolments_set_updated_at
before update on public.school_enrolments
for each row execute function public.set_updated_at();

create trigger school_enrolments_reject_school_id_change
before update on public.school_enrolments
for each row execute function public.reject_school_id_change();

alter table public.school_enrolments enable row level security;
alter table public.school_enrolments force row level security;
revoke all on table public.school_enrolments from anon, authenticated;
grant select on table public.school_enrolments to authenticated;

create policy school_enrolments_select_member
on public.school_enrolments
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_student
-- ---------------------------------------------------------------------------

create or replace function public.create_school_student(
  p_school_id uuid,
  p_student_number text,
  p_first_name text,
  p_last_name text,
  p_date_of_birth date default null,
  p_gender text default null,
  p_school_campus_id uuid default null
)
returns table (
  student_id uuid,
  school_id uuid,
  student_number text,
  first_name text,
  last_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_number text := nullif(trim(p_student_number), '');
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_gender text := nullif(trim(p_gender), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage students' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Students require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_number is null then
    raise exception 'Student number is required' using errcode = '22023';
  end if;
  if v_first is null or v_last is null then
    raise exception 'First and last name are required' using errcode = '22023';
  end if;
  if v_gender is not null
     and v_gender not in ('female', 'male', 'other', 'unspecified') then
    raise exception 'Invalid gender value' using errcode = '22023';
  end if;
  if p_school_campus_id is not null then
    if not exists (
      select 1 from public.school_campuses as c
      where c.id = p_school_campus_id
        and c.school_id = p_school_id
    ) then
      raise exception 'Campus not found in this school' using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_students (
    school_id, school_campus_id, student_number, first_name, last_name,
    date_of_birth, gender
  )
  values (
    p_school_id, p_school_campus_id, v_number, v_first, v_last,
    p_date_of_birth, v_gender
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student.created',
    'school_student',
    v_id,
    jsonb_build_object(
      'student_number', v_number,
      'first_name', v_first,
      'last_name', v_last
    ),
    'success',
    v_role,
    p_school_id
  );

  student_id := v_id;
  school_id := p_school_id;
  student_number := v_number;
  first_name := v_first;
  last_name := v_last;
  return next;
end;
$$;

revoke all on function public.create_school_student(
  uuid, text, text, text, date, text, uuid
) from public, anon;
grant execute on function public.create_school_student(
  uuid, text, text, text, date, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_enrolment
-- ---------------------------------------------------------------------------

create or replace function public.create_school_enrolment(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_grade_id uuid,
  p_section_id uuid default null,
  p_enrolled_on date default current_date
)
returns table (
  enrolment_id uuid,
  school_id uuid,
  student_id uuid,
  academic_year_id uuid,
  grade_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_student_status text;
  v_year_school uuid;
  v_grade_school uuid;
  v_section_grade uuid;
  v_section_school uuid;
  v_enrolled_on date := coalesce(p_enrolled_on, current_date);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_student_id is null or p_academic_year_id is null or p_grade_id is null then
    raise exception 'student, academic year, and grade are required'
      using errcode = '22023';
  end if;

  select s.school_id, s.status
  into v_school_id, v_student_status
  from public.school_students as s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage enrolments' using errcode = '42501';
  end if;
  if v_student_status is distinct from 'active' then
    raise exception 'Only active students can be enrolled' using errcode = '22023';
  end if;

  select y.school_id into v_year_school
  from public.school_academic_years as y
  where y.id = p_academic_year_id;
  if not found or v_year_school is distinct from v_school_id then
    raise exception 'Academic year not found in this school' using errcode = 'P0002';
  end if;

  select g.school_id into v_grade_school
  from public.school_grades as g
  where g.id = p_grade_id
    and g.status = 'active';
  if not found or v_grade_school is distinct from v_school_id then
    raise exception 'Grade not found in this school' using errcode = 'P0002';
  end if;

  if p_section_id is not null then
    select sec.school_id, sec.grade_id
    into v_section_school, v_section_grade
    from public.school_sections as sec
    where sec.id = p_section_id
      and sec.status = 'active';
    if not found
       or v_section_school is distinct from v_school_id
       or v_section_grade is distinct from p_grade_id then
      raise exception 'Section not found for this grade'
        using errcode = 'P0002';
    end if;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_enrolments (
    school_id, student_id, academic_year_id, grade_id, section_id,
    status, enrolled_on
  )
  values (
    v_school_id, p_student_id, p_academic_year_id, p_grade_id, p_section_id,
    'enrolled', v_enrolled_on
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.enrolment.created',
    'school_enrolment',
    v_id,
    jsonb_build_object(
      'student_id', p_student_id,
      'academic_year_id', p_academic_year_id,
      'grade_id', p_grade_id,
      'section_id', p_section_id
    ),
    'success',
    v_role,
    v_school_id
  );

  enrolment_id := v_id;
  school_id := v_school_id;
  student_id := p_student_id;
  academic_year_id := p_academic_year_id;
  grade_id := p_grade_id;
  return next;
exception
  when unique_violation then
    raise exception 'Student already has an active enrolment for this year'
      using errcode = '23505';
end;
$$;

revoke all on function public.create_school_enrolment(
  uuid, uuid, uuid, uuid, date
) from public, anon;
grant execute on function public.create_school_enrolment(
  uuid, uuid, uuid, uuid, date
) to authenticated;

-- ---------------------------------------------------------------------------
-- withdraw_school_enrolment
-- ---------------------------------------------------------------------------

create or replace function public.withdraw_school_enrolment(p_enrolment_id uuid)
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

  select e.school_id,
         jsonb_build_object(
           'student_id', e.student_id,
           'academic_year_id', e.academic_year_id,
           'status', e.status
         )
  into v_school_id, v_old
  from public.school_enrolments as e
  where e.id = p_enrolment_id
  for update;

  if not found then
    raise exception 'Enrolment not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage enrolments' using errcode = '42501';
  end if;
  if (v_old->>'status') = 'withdrawn' then
    return;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_enrolments
  set status = 'withdrawn'
  where id = p_enrolment_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.enrolment.withdrawn',
    'school_enrolment',
    p_enrolment_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'student_id', v_old->>'student_id',
        'academic_year_id', v_old->>'academic_year_id',
        'status', 'withdrawn'
      )
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.withdraw_school_enrolment(uuid) from public, anon;
grant execute on function public.withdraw_school_enrolment(uuid) to authenticated;
