-- School examinations, grading scales, papers (subject offerings), and marks.
-- Published exams lock ordinary mark edits; managers may unpublish to correct.

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_school_exam_editor(p_school_id uuid)
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
      and m.role in ('owner', 'admin', 'teacher')
  );
$$;

comment on function public.is_school_exam_editor(uuid) is
  'True when the current user may enter or edit unpublished exam marks.';

revoke all on function public.is_school_exam_editor(uuid) from public;
grant execute on function public.is_school_exam_editor(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Grading scales
-- ---------------------------------------------------------------------------

create table if not exists public.school_grading_scales (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  is_default boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_grading_scales_name_not_blank check (length(trim(name)) > 0),
  constraint school_grading_scales_status_valid check (
    status in ('active', 'archived')
  ),
  constraint school_grading_scales_school_name_unique unique (school_id, name)
);

create unique index if not exists school_grading_scales_one_default_per_school
  on public.school_grading_scales (school_id)
  where is_default and status = 'active';

create index if not exists school_grading_scales_school_id_idx
  on public.school_grading_scales (school_id);

drop trigger if exists school_grading_scales_set_updated_at
  on public.school_grading_scales;
create trigger school_grading_scales_set_updated_at
before update on public.school_grading_scales
for each row execute function public.set_updated_at();

drop trigger if exists school_grading_scales_reject_school_id_change
  on public.school_grading_scales;
create trigger school_grading_scales_reject_school_id_change
before update on public.school_grading_scales
for each row execute function public.reject_school_id_change();

alter table public.school_grading_scales enable row level security;
alter table public.school_grading_scales force row level security;
revoke all on table public.school_grading_scales from anon, authenticated;
grant select on table public.school_grading_scales to authenticated;

drop policy if exists school_grading_scales_select_member
  on public.school_grading_scales;
create policy school_grading_scales_select_member
on public.school_grading_scales
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

create table if not exists public.school_grading_bands (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  scale_id uuid not null
    references public.school_grading_scales (id)
    on delete cascade,
  min_percent numeric(5, 2) not null,
  max_percent numeric(5, 2) not null,
  grade_label text not null,
  is_pass boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  constraint school_grading_bands_label_not_blank
    check (length(trim(grade_label)) > 0),
  constraint school_grading_bands_percent_range check (
    min_percent >= 0 and max_percent <= 100 and min_percent <= max_percent
  ),
  constraint school_grading_bands_sort_positive check (sort_order >= 1)
);

create index if not exists school_grading_bands_scale_id_idx
  on public.school_grading_bands (scale_id);

alter table public.school_grading_bands enable row level security;
alter table public.school_grading_bands force row level security;
revoke all on table public.school_grading_bands from anon, authenticated;
grant select on table public.school_grading_bands to authenticated;

drop policy if exists school_grading_bands_select_member
  on public.school_grading_bands;
create policy school_grading_bands_select_member
on public.school_grading_bands
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Examinations
-- ---------------------------------------------------------------------------

create table if not exists public.school_examinations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  academic_year_id uuid not null
    references public.school_academic_years (id)
    on delete restrict,
  academic_term_id uuid
    references public.school_academic_terms (id)
    on delete restrict,
  grading_scale_id uuid not null
    references public.school_grading_scales (id)
    on delete restrict,
  name text not null,
  exam_type text not null,
  starts_on date,
  ends_on date,
  status text not null default 'draft',
  publish_ranks boolean not null default true,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_examinations_name_not_blank check (length(trim(name)) > 0),
  constraint school_examinations_type_valid check (
    exam_type in ('monthly', 'midterm', 'final', 'annual', 'other')
  ),
  constraint school_examinations_status_valid check (
    status in ('draft', 'marking', 'published', 'archived')
  ),
  constraint school_examinations_dates_order check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  ),
  constraint school_examinations_publish_consistency check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  )
);

comment on table public.school_examinations is
  'School examination events (monthly/midterm/final/annual) with publish lock.';

create index if not exists school_examinations_school_id_idx
  on public.school_examinations (school_id);
create index if not exists school_examinations_year_id_idx
  on public.school_examinations (academic_year_id);
create index if not exists school_examinations_school_status_idx
  on public.school_examinations (school_id, status);

drop trigger if exists school_examinations_set_updated_at
  on public.school_examinations;
create trigger school_examinations_set_updated_at
before update on public.school_examinations
for each row execute function public.set_updated_at();

drop trigger if exists school_examinations_reject_school_id_change
  on public.school_examinations;
create trigger school_examinations_reject_school_id_change
before update on public.school_examinations
for each row execute function public.reject_school_id_change();

alter table public.school_examinations enable row level security;
alter table public.school_examinations force row level security;
revoke all on table public.school_examinations from anon, authenticated;
grant select on table public.school_examinations to authenticated;

drop policy if exists school_examinations_select_member
  on public.school_examinations;
create policy school_examinations_select_member
on public.school_examinations
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Exam papers (subject offering for a class/section)
-- ---------------------------------------------------------------------------

create table if not exists public.school_exam_papers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  examination_id uuid not null
    references public.school_examinations (id)
    on delete cascade,
  grade_id uuid not null
    references public.school_grades (id)
    on delete restrict,
  section_id uuid not null
    references public.school_sections (id)
    on delete restrict,
  subject_id uuid not null
    references public.school_subjects (id)
    on delete restrict,
  max_marks numeric(8, 2) not null,
  pass_marks numeric(8, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_exam_papers_max_positive check (max_marks > 0),
  constraint school_exam_papers_pass_range check (
    pass_marks >= 0 and pass_marks <= max_marks
  ),
  constraint school_exam_papers_unique_offering unique (
    examination_id, section_id, subject_id
  )
);

create index if not exists school_exam_papers_exam_id_idx
  on public.school_exam_papers (examination_id);
create index if not exists school_exam_papers_section_id_idx
  on public.school_exam_papers (section_id);
create index if not exists school_exam_papers_school_id_idx
  on public.school_exam_papers (school_id);

drop trigger if exists school_exam_papers_set_updated_at
  on public.school_exam_papers;
create trigger school_exam_papers_set_updated_at
before update on public.school_exam_papers
for each row execute function public.set_updated_at();

drop trigger if exists school_exam_papers_reject_school_id_change
  on public.school_exam_papers;
create trigger school_exam_papers_reject_school_id_change
before update on public.school_exam_papers
for each row execute function public.reject_school_id_change();

alter table public.school_exam_papers enable row level security;
alter table public.school_exam_papers force row level security;
revoke all on table public.school_exam_papers from anon, authenticated;
grant select on table public.school_exam_papers to authenticated;

drop policy if exists school_exam_papers_select_member
  on public.school_exam_papers;
create policy school_exam_papers_select_member
on public.school_exam_papers
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Marks
-- ---------------------------------------------------------------------------

create table if not exists public.school_exam_marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  paper_id uuid not null
    references public.school_exam_papers (id)
    on delete cascade,
  student_id uuid not null
    references public.school_students (id)
    on delete restrict,
  marks_obtained numeric(8, 2),
  attendance_status text not null default 'present',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_exam_marks_attendance_valid check (
    attendance_status in ('present', 'absent', 'exempt')
  ),
  constraint school_exam_marks_marks_non_negative check (
    marks_obtained is null or marks_obtained >= 0
  ),
  constraint school_exam_marks_absent_no_marks check (
    attendance_status = 'present'
    or marks_obtained is null
  ),
  constraint school_exam_marks_remarks_length check (
    remarks is null or length(remarks) <= 500
  ),
  constraint school_exam_marks_paper_student_unique unique (paper_id, student_id)
);

create index if not exists school_exam_marks_paper_id_idx
  on public.school_exam_marks (paper_id);
create index if not exists school_exam_marks_student_id_idx
  on public.school_exam_marks (student_id);
create index if not exists school_exam_marks_school_id_idx
  on public.school_exam_marks (school_id);

drop trigger if exists school_exam_marks_set_updated_at
  on public.school_exam_marks;
create trigger school_exam_marks_set_updated_at
before update on public.school_exam_marks
for each row execute function public.set_updated_at();

drop trigger if exists school_exam_marks_reject_school_id_change
  on public.school_exam_marks;
create trigger school_exam_marks_reject_school_id_change
before update on public.school_exam_marks
for each row execute function public.reject_school_id_change();

alter table public.school_exam_marks enable row level security;
alter table public.school_exam_marks force row level security;
revoke all on table public.school_exam_marks from anon, authenticated;
grant select on table public.school_exam_marks to authenticated;

drop policy if exists school_exam_marks_select_member
  on public.school_exam_marks;
create policy school_exam_marks_select_member
on public.school_exam_marks
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Ensure default percentage grading scale
-- ---------------------------------------------------------------------------

create or replace function public.ensure_school_default_grading_scale(
  p_school_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scale_id uuid;
begin
  select s.id into v_scale_id
  from public.school_grading_scales as s
  where s.school_id = p_school_id
    and s.is_default
    and s.status = 'active'
  limit 1;

  if v_scale_id is not null then
    return v_scale_id;
  end if;

  insert into public.school_grading_scales (
    school_id, name, is_default, status
  )
  values (p_school_id, 'Percentage (default)', true, 'active')
  returning id into v_scale_id;

  insert into public.school_grading_bands (
    school_id, scale_id, min_percent, max_percent, grade_label, is_pass, sort_order
  )
  values
    (p_school_id, v_scale_id, 90, 100, 'A+', true, 1),
    (p_school_id, v_scale_id, 80, 89.99, 'A', true, 2),
    (p_school_id, v_scale_id, 70, 79.99, 'B', true, 3),
    (p_school_id, v_scale_id, 60, 69.99, 'C', true, 4),
    (p_school_id, v_scale_id, 50, 59.99, 'D', true, 5),
    (p_school_id, v_scale_id, 0, 49.99, 'F', false, 6);

  return v_scale_id;
end;
$$;

revoke all on function public.ensure_school_default_grading_scale(uuid)
  from public, anon;
grant execute on function public.ensure_school_default_grading_scale(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_examination
-- ---------------------------------------------------------------------------

create or replace function public.create_school_examination(
  p_school_id uuid,
  p_academic_year_id uuid,
  p_academic_term_id uuid,
  p_name text,
  p_exam_type text,
  p_starts_on date default null,
  p_ends_on date default null,
  p_publish_ranks boolean default true
)
returns table (
  examination_id uuid,
  school_id uuid,
  name text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_type text := nullif(trim(p_exam_type), '');
  v_scale_id uuid;
  v_year_school uuid;
  v_term_school uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage examinations'
      using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Examinations require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Examination name is required' using errcode = '22023';
  end if;
  if v_type is null
     or v_type not in ('monthly', 'midterm', 'final', 'annual', 'other') then
    raise exception 'Invalid examination type' using errcode = '22023';
  end if;
  if p_starts_on is not null and p_ends_on is not null
     and p_ends_on < p_starts_on then
    raise exception 'End date must be on or after start date'
      using errcode = '22023';
  end if;

  select y.school_id into v_year_school
  from public.school_academic_years as y
  where y.id = p_academic_year_id;
  if v_year_school is distinct from p_school_id then
    raise exception 'Academic year not found in this school'
      using errcode = 'P0002';
  end if;

  if p_academic_term_id is not null then
    select t.school_id into v_term_school
    from public.school_academic_terms as t
    where t.id = p_academic_term_id
      and t.academic_year_id = p_academic_year_id;
    if v_term_school is distinct from p_school_id then
      raise exception 'Academic term not found for this year'
        using errcode = 'P0002';
    end if;
  end if;

  v_scale_id := public.ensure_school_default_grading_scale(p_school_id);

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_examinations (
    school_id, academic_year_id, academic_term_id, grading_scale_id,
    name, exam_type, starts_on, ends_on, status, publish_ranks
  )
  values (
    p_school_id, p_academic_year_id, p_academic_term_id, v_scale_id,
    v_name, v_type, p_starts_on, p_ends_on, 'draft',
    coalesce(p_publish_ranks, true)
  )
  returning id into v_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.examination.created',
    'school_examination', v_id,
    jsonb_build_object(
      'name', v_name,
      'exam_type', v_type,
      'academic_year_id', p_academic_year_id
    ),
    'success', v_role, p_school_id
  );

  examination_id := v_id;
  school_id := p_school_id;
  name := v_name;
  status := 'draft';
  return next;
end;
$$;

revoke all on function public.create_school_examination(
  uuid, uuid, uuid, text, text, date, date, boolean
) from public, anon;
grant execute on function public.create_school_examination(
  uuid, uuid, uuid, text, text, date, date, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- add_school_exam_paper
-- ---------------------------------------------------------------------------

create or replace function public.add_school_exam_paper(
  p_examination_id uuid,
  p_grade_id uuid,
  p_section_id uuid,
  p_subject_id uuid,
  p_max_marks numeric,
  p_pass_marks numeric
)
returns table (
  paper_id uuid,
  examination_id uuid,
  subject_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_status text;
  v_grade_school uuid;
  v_section_school uuid;
  v_section_grade uuid;
  v_subject_school uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select e.school_id, e.status into v_school_id, v_status
  from public.school_examinations as e
  where e.id = p_examination_id
  for update;

  if not found then
    raise exception 'Examination not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage examinations'
      using errcode = '42501';
  end if;
  if v_status = 'published' then
    raise exception 'Cannot change subjects on a published examination'
      using errcode = '22023';
  end if;
  if v_status = 'archived' then
    raise exception 'Cannot change an archived examination'
      using errcode = '22023';
  end if;
  if p_max_marks is null or p_max_marks <= 0 then
    raise exception 'Maximum marks must be greater than zero'
      using errcode = '22023';
  end if;
  if p_pass_marks is null or p_pass_marks < 0 or p_pass_marks > p_max_marks then
    raise exception 'Passing marks must be between 0 and maximum marks'
      using errcode = '22023';
  end if;

  select g.school_id into v_grade_school
  from public.school_grades as g
  where g.id = p_grade_id and g.status = 'active';
  select sec.school_id, sec.grade_id into v_section_school, v_section_grade
  from public.school_sections as sec
  where sec.id = p_section_id and sec.status = 'active';
  select sub.school_id into v_subject_school
  from public.school_subjects as sub
  where sub.id = p_subject_id and sub.status = 'active';

  if v_grade_school is distinct from v_school_id
     or v_section_school is distinct from v_school_id
     or v_subject_school is distinct from v_school_id then
    raise exception 'Grade, section, and subject must belong to this school'
      using errcode = '22023';
  end if;
  if v_section_grade is distinct from p_grade_id then
    raise exception 'Section does not belong to the selected class'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_exam_papers (
    school_id, examination_id, grade_id, section_id, subject_id,
    max_marks, pass_marks
  )
  values (
    v_school_id, p_examination_id, p_grade_id, p_section_id, p_subject_id,
    p_max_marks, p_pass_marks
  )
  returning id into v_id;

  update public.school_examinations
  set status = case when status = 'draft' then 'marking' else status end
  where id = p_examination_id
    and status = 'draft';

  perform public.write_audit_event(
    null, v_user_id, 'school.exam_paper.created',
    'school_exam_paper', v_id,
    jsonb_build_object(
      'examination_id', p_examination_id,
      'subject_id', p_subject_id,
      'section_id', p_section_id,
      'max_marks', p_max_marks,
      'pass_marks', p_pass_marks
    ),
    'success', v_role, v_school_id
  );

  paper_id := v_id;
  examination_id := p_examination_id;
  subject_id := p_subject_id;
  return next;
end;
$$;

revoke all on function public.add_school_exam_paper(
  uuid, uuid, uuid, uuid, numeric, numeric
) from public, anon;
grant execute on function public.add_school_exam_paper(
  uuid, uuid, uuid, uuid, numeric, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- upsert_school_exam_mark (single)
-- ---------------------------------------------------------------------------

create or replace function public.upsert_school_exam_mark(
  p_paper_id uuid,
  p_student_id uuid,
  p_attendance_status text,
  p_marks_obtained numeric default null,
  p_remarks text default null
)
returns table (
  mark_id uuid,
  paper_id uuid,
  student_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_exam_status text;
  v_max numeric(8, 2);
  v_section_id uuid;
  v_student_school uuid;
  v_enrolled boolean;
  v_att text := lower(nullif(trim(p_attendance_status), ''));
  v_remarks text := nullif(trim(p_remarks), '');
  v_marks numeric(8, 2) := p_marks_obtained;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.school_id, p.max_marks, p.section_id, e.status
  into v_school_id, v_max, v_section_id, v_exam_status
  from public.school_exam_papers as p
  join public.school_examinations as e on e.id = p.examination_id
  where p.id = p_paper_id
  for update of p;

  if not found then
    raise exception 'Exam paper not found' using errcode = 'P0002';
  end if;
  if not public.is_school_exam_editor(v_school_id) then
    raise exception 'Not authorized to enter examination marks'
      using errcode = '42501';
  end if;
  if v_exam_status = 'published' then
    raise exception 'Published results are locked. Unpublish to correct marks.'
      using errcode = '22023';
  end if;
  if v_exam_status = 'archived' then
    raise exception 'Cannot edit marks on an archived examination'
      using errcode = '22023';
  end if;
  if v_att is null or v_att not in ('present', 'absent', 'exempt') then
    raise exception 'Attendance status must be present, absent, or exempt'
      using errcode = '22023';
  end if;

  if v_att <> 'present' then
    v_marks := null;
  else
    if v_marks is null then
      raise exception 'Marks are required when the student is present'
        using errcode = '22023';
    end if;
    if v_marks < 0 or v_marks > v_max then
      raise exception 'Marks must be between 0 and %', v_max
        using errcode = '22023';
    end if;
  end if;

  select s.school_id into v_student_school
  from public.school_students as s
  where s.id = p_student_id and s.status = 'active';
  if v_student_school is distinct from v_school_id then
    raise exception 'Student not found in this school' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.school_enrolments as en
    join public.school_exam_papers as p on p.id = p_paper_id
    join public.school_examinations as ex on ex.id = p.examination_id
    where en.student_id = p_student_id
      and en.school_id = v_school_id
      and en.status = 'enrolled'
      and en.academic_year_id = ex.academic_year_id
      and en.section_id = p.section_id
  ) into v_enrolled;

  if not v_enrolled then
    raise exception 'Student is not enrolled in this class section for the exam year'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_exam_marks (
    school_id, paper_id, student_id, marks_obtained, attendance_status, remarks
  )
  values (
    v_school_id, p_paper_id, p_student_id, v_marks, v_att, v_remarks
  )
  on conflict (paper_id, student_id) do update
  set marks_obtained = excluded.marks_obtained,
      attendance_status = excluded.attendance_status,
      remarks = excluded.remarks,
      updated_at = now()
  returning id into v_id;

  update public.school_examinations as e
  set status = 'marking'
  where e.id = (
      select p.examination_id from public.school_exam_papers as p
      where p.id = p_paper_id
    )
    and e.status = 'draft';

  perform public.write_audit_event(
    null, v_user_id, 'school.exam_mark.upserted',
    'school_exam_mark', v_id,
    jsonb_build_object(
      'paper_id', p_paper_id,
      'student_id', p_student_id,
      'marks_obtained', v_marks,
      'attendance_status', v_att
    ),
    'success', v_role, v_school_id
  );

  mark_id := v_id;
  paper_id := p_paper_id;
  student_id := p_student_id;
  return next;
end;
$$;

revoke all on function public.upsert_school_exam_mark(
  uuid, uuid, text, numeric, text
) from public, anon;
grant execute on function public.upsert_school_exam_mark(
  uuid, uuid, text, numeric, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- publish / unpublish
-- ---------------------------------------------------------------------------

create or replace function public.publish_school_examination(p_examination_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_status text;
  v_paper_count int;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select e.school_id, e.status into v_school_id, v_status
  from public.school_examinations as e
  where e.id = p_examination_id
  for update;

  if not found then
    raise exception 'Examination not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to publish examinations'
      using errcode = '42501';
  end if;
  if v_status = 'published' then
    return;
  end if;
  if v_status = 'archived' then
    raise exception 'Cannot publish an archived examination'
      using errcode = '22023';
  end if;

  select count(*) into v_paper_count
  from public.school_exam_papers as p
  where p.examination_id = p_examination_id;
  if v_paper_count = 0 then
    raise exception 'Add at least one subject before publishing'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_examinations
  set status = 'published',
      published_at = now(),
      published_by = v_user_id
  where id = p_examination_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.examination.published',
    'school_examination', p_examination_id,
    jsonb_build_object('status', 'published'),
    'success', v_role, v_school_id
  );
end;
$$;

revoke all on function public.publish_school_examination(uuid)
  from public, anon;
grant execute on function public.publish_school_examination(uuid)
  to authenticated;

create or replace function public.unpublish_school_examination(
  p_examination_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select e.school_id, e.status into v_school_id, v_status
  from public.school_examinations as e
  where e.id = p_examination_id
  for update;

  if not found then
    raise exception 'Examination not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to unpublish examinations'
      using errcode = '42501';
  end if;
  if v_status <> 'published' then
    raise exception 'Only published examinations can be unpublished'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_examinations
  set status = 'marking',
      published_at = null,
      published_by = null
  where id = p_examination_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.examination.unpublished',
    'school_examination', p_examination_id,
    jsonb_build_object('status', 'marking', 'reason', 'correction'),
    'success', v_role, v_school_id
  );
end;
$$;

revoke all on function public.unpublish_school_examination(uuid)
  from public, anon;
grant execute on function public.unpublish_school_examination(uuid)
  to authenticated;

create or replace function public.delete_school_exam_paper(p_paper_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_exam_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.school_id, p.examination_id, e.status
  into v_school_id, v_exam_id, v_status
  from public.school_exam_papers as p
  join public.school_examinations as e on e.id = p.examination_id
  where p.id = p_paper_id
  for update of p;

  if not found then
    raise exception 'Exam paper not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage examinations'
      using errcode = '42501';
  end if;
  if v_status = 'published' then
    raise exception 'Cannot remove subjects from a published examination'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  delete from public.school_exam_papers where id = p_paper_id;

  perform public.write_audit_event(
    null, v_user_id, 'school.exam_paper.deleted',
    'school_exam_paper', p_paper_id,
    jsonb_build_object('examination_id', v_exam_id),
    'success', v_role, v_school_id
  );
end;
$$;

revoke all on function public.delete_school_exam_paper(uuid)
  from public, anon;
grant execute on function public.delete_school_exam_paper(uuid)
  to authenticated;
