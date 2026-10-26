-- Phase 11 continued: school student CSV import (dry-run → commit)
-- Request-bound batches only. No queue/worker yet. No Excel binary parsing in DB.

-- ---------------------------------------------------------------------------
-- school_student_import_batches
-- ---------------------------------------------------------------------------

create table public.school_student_import_batches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  filename text not null,
  status text not null default 'dry_run',
  row_count integer not null default 0,
  valid_count integer not null default 0,
  error_count integer not null default 0,
  duplicate_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  created_by uuid
    references auth.users (id)
    on delete set null,
  committed_by uuid
    references auth.users (id)
    on delete set null,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_student_import_batches_filename_not_blank
    check (length(trim(filename)) > 0),
  constraint school_student_import_batches_status_valid check (
    status in ('dry_run', 'committed', 'cancelled')
  ),
  constraint school_student_import_batches_counts_nonneg check (
    row_count >= 0
    and valid_count >= 0
    and error_count >= 0
    and duplicate_count >= 0
    and imported_count >= 0
    and skipped_count >= 0
  )
);

comment on table public.school_student_import_batches is
  'Student CSV import batches: dry-run validation then explicit commit.';

create index school_student_import_batches_school_id_idx
  on public.school_student_import_batches (school_id);
create index school_student_import_batches_school_created_idx
  on public.school_student_import_batches (school_id, created_at desc);

create trigger school_student_import_batches_set_updated_at
before update on public.school_student_import_batches
for each row execute function public.set_updated_at();

create trigger school_student_import_batches_reject_school_id_change
before update on public.school_student_import_batches
for each row execute function public.reject_school_id_change();

alter table public.school_student_import_batches enable row level security;
alter table public.school_student_import_batches force row level security;
revoke all on table public.school_student_import_batches
  from anon, authenticated;
grant select on table public.school_student_import_batches to authenticated;

create policy school_student_import_batches_select_member
on public.school_student_import_batches
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_student_import_rows
-- ---------------------------------------------------------------------------

create table public.school_student_import_rows (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  batch_id uuid not null
    references public.school_student_import_batches (id)
    on delete cascade,
  row_number integer not null,
  student_number text,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  academic_year_name text,
  grade_name text,
  section_name text,
  validation_status text not null default 'error',
  error_message text,
  student_id uuid
    references public.school_students (id)
    on delete set null,
  enrolment_id uuid
    references public.school_enrolments (id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_student_import_rows_row_number_positive
    check (row_number >= 1),
  constraint school_student_import_rows_status_valid check (
    validation_status in (
      'valid', 'error', 'duplicate', 'imported', 'skipped'
    )
  ),
  constraint school_student_import_rows_batch_row_unique
    unique (batch_id, row_number)
);

comment on table public.school_student_import_rows is
  'Per-row dry-run / commit outcome for a student import batch.';

create index school_student_import_rows_batch_id_idx
  on public.school_student_import_rows (batch_id);
create index school_student_import_rows_school_id_idx
  on public.school_student_import_rows (school_id);

create trigger school_student_import_rows_set_updated_at
before update on public.school_student_import_rows
for each row execute function public.set_updated_at();

create trigger school_student_import_rows_reject_school_id_change
before update on public.school_student_import_rows
for each row execute function public.reject_school_id_change();

alter table public.school_student_import_rows enable row level security;
alter table public.school_student_import_rows force row level security;
revoke all on table public.school_student_import_rows from anon, authenticated;
grant select on table public.school_student_import_rows to authenticated;

create policy school_student_import_rows_select_member
on public.school_student_import_rows
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_student_import_dry_run
-- p_rows: [{
--   "row_number":1,"student_number":"...","first_name":"...","last_name":"...",
--   "date_of_birth":"YYYY-MM-DD"|null,"gender":"male"|null,
--   "academic_year_name":null,"grade_name":null,"section_name":null
-- }, ...]
-- ---------------------------------------------------------------------------

create or replace function public.create_school_student_import_dry_run(
  p_school_id uuid,
  p_filename text,
  p_rows jsonb
)
returns table (
  batch_id uuid,
  school_id uuid,
  status text,
  row_count integer,
  valid_count integer,
  error_count integer,
  duplicate_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_filename text := nullif(trim(p_filename), '');
  v_batch_id uuid;
  v_item jsonb;
  v_row_number integer;
  v_number text;
  v_first text;
  v_last text;
  v_dob date;
  v_gender text;
  v_year_name text;
  v_grade_name text;
  v_section_name text;
  v_status text;
  v_error text;
  v_row_count integer := 0;
  v_valid integer := 0;
  v_errors integer := 0;
  v_dupes integer := 0;
  v_seen text[];
  v_year_id uuid;
  v_grade_id uuid;
  v_section_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to import students' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Students require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_filename is null or length(v_filename) > 255 then
    raise exception 'filename is required' using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'rows must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) < 1 then
    raise exception 'Import requires at least one data row' using errcode = '22023';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'Import is limited to 500 rows per batch' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_student_import_batches (
    school_id, filename, status, created_by
  )
  values (p_school_id, v_filename, 'dry_run', v_user_id)
  returning id into v_batch_id;

  v_seen := array[]::text[];

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    v_row_count := v_row_count + 1;
    v_status := 'valid';
    v_error := null;
    v_dob := null;
    v_year_id := null;
    v_grade_id := null;
    v_section_id := null;

    begin
      v_row_number := coalesce((v_item ->> 'row_number')::integer, v_row_count);
    exception
      when others then
        v_row_number := v_row_count;
        v_status := 'error';
        v_error := 'Invalid row_number';
    end;

    v_number := nullif(trim(v_item ->> 'student_number'), '');
    v_first := nullif(trim(v_item ->> 'first_name'), '');
    v_last := nullif(trim(v_item ->> 'last_name'), '');
    v_gender := lower(nullif(trim(v_item ->> 'gender'), ''));
    v_year_name := nullif(trim(v_item ->> 'academic_year_name'), '');
    v_grade_name := nullif(trim(v_item ->> 'grade_name'), '');
    v_section_name := nullif(trim(v_item ->> 'section_name'), '');

    if v_status = 'valid' and v_number is null then
      v_status := 'error';
      v_error := 'Student number is required';
    elsif v_status = 'valid' and length(v_number) > 64 then
      v_status := 'error';
      v_error := 'Student number must be 64 characters or fewer';
    end if;

    if v_status = 'valid' and (v_first is null or v_last is null) then
      v_status := 'error';
      v_error := 'First and last name are required';
    elsif v_status = 'valid'
       and (length(v_first) > 120 or length(v_last) > 120) then
      v_status := 'error';
      v_error := 'Names must be 120 characters or fewer';
    end if;

    if v_status = 'valid' and (v_item ? 'date_of_birth')
       and nullif(trim(v_item ->> 'date_of_birth'), '') is not null then
      begin
        v_dob := (trim(v_item ->> 'date_of_birth'))::date;
      exception
        when others then
          v_status := 'error';
          v_error := 'Invalid date_of_birth (use YYYY-MM-DD)';
      end;
    end if;

    if v_status = 'valid' and v_gender is not null
       and v_gender not in ('female', 'male', 'other', 'unspecified') then
      v_status := 'error';
      v_error := 'Invalid gender (female|male|other|unspecified)';
    end if;

    if v_status = 'valid' and v_number = any (v_seen) then
      v_status := 'duplicate';
      v_error := 'Duplicate student_number within this file';
    end if;

    if v_status = 'valid' and exists (
      select 1 from public.school_students as s
      where s.school_id = p_school_id
        and s.student_number = v_number
    ) then
      v_status := 'duplicate';
      v_error := 'Student number already exists in this school';
    end if;

    -- Optional enrolment resolution by name
    if v_status = 'valid' and (
      v_year_name is not null or v_grade_name is not null or v_section_name is not null
    ) then
      if v_year_name is null or v_grade_name is null then
        v_status := 'error';
        v_error := 'Enrolment requires academic_year_name and grade_name';
      else
        select y.id into v_year_id
        from public.school_academic_years as y
        where y.school_id = p_school_id
          and lower(y.name) = lower(v_year_name)
        limit 1;
        if v_year_id is null then
          v_status := 'error';
          v_error := 'Academic year not found: ' || v_year_name;
        end if;

        if v_status = 'valid' then
          select g.id into v_grade_id
          from public.school_grades as g
          where g.school_id = p_school_id
            and g.status = 'active'
            and lower(g.name) = lower(v_grade_name)
          limit 1;
          if v_grade_id is null then
            v_status := 'error';
            v_error := 'Grade not found: ' || v_grade_name;
          end if;
        end if;

        if v_status = 'valid' and v_section_name is not null then
          select sec.id into v_section_id
          from public.school_sections as sec
          where sec.school_id = p_school_id
            and sec.grade_id = v_grade_id
            and sec.status = 'active'
            and lower(sec.name) = lower(v_section_name)
          limit 1;
          if v_section_id is null then
            v_status := 'error';
            v_error := 'Section not found for grade: ' || v_section_name;
          end if;
        end if;
      end if;
    end if;

    if v_number is not null then
      v_seen := array_append(v_seen, v_number);
    end if;

    if v_status = 'valid' then
      v_valid := v_valid + 1;
    elsif v_status = 'duplicate' then
      v_dupes := v_dupes + 1;
    else
      v_errors := v_errors + 1;
    end if;

    insert into public.school_student_import_rows (
      school_id, batch_id, row_number,
      student_number, first_name, last_name, date_of_birth, gender,
      academic_year_name, grade_name, section_name,
      validation_status, error_message
    )
    values (
      p_school_id, v_batch_id, v_row_number,
      v_number, v_first, v_last, v_dob, v_gender,
      v_year_name, v_grade_name, v_section_name,
      v_status, v_error
    );
  end loop;

  update public.school_student_import_batches as b
  set row_count = v_row_count,
      valid_count = v_valid,
      error_count = v_errors,
      duplicate_count = v_dupes
  where b.id = v_batch_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student_import.dry_run',
    'school_student_import_batch',
    v_batch_id,
    jsonb_build_object(
      'filename', v_filename,
      'row_count', v_row_count,
      'valid_count', v_valid,
      'error_count', v_errors,
      'duplicate_count', v_dupes
    ),
    'success',
    v_role,
    p_school_id
  );

  batch_id := v_batch_id;
  school_id := p_school_id;
  status := 'dry_run';
  row_count := v_row_count;
  valid_count := v_valid;
  error_count := v_errors;
  duplicate_count := v_dupes;
  return next;
end;
$$;

revoke all on function public.create_school_student_import_dry_run(uuid, text, jsonb)
  from public, anon;
grant execute on function public.create_school_student_import_dry_run(uuid, text, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- commit_school_student_import_batch
-- Inserts all valid rows in one transaction. Duplicates/errors are skipped.
-- ---------------------------------------------------------------------------

create or replace function public.commit_school_student_import_batch(
  p_batch_id uuid
)
returns table (
  batch_id uuid,
  status text,
  imported_count integer,
  skipped_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_batch_status text;
  v_valid integer;
  v_imported integer := 0;
  v_skipped integer := 0;
  v_row record;
  v_student_id uuid;
  v_enrolment_id uuid;
  v_year_id uuid;
  v_grade_id uuid;
  v_section_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_batch_id is null then
    raise exception 'batch_id is required' using errcode = '22023';
  end if;

  select b.school_id, b.status, b.valid_count
  into v_school_id, v_batch_status, v_valid
  from public.school_student_import_batches as b
  where b.id = p_batch_id
  for update;

  if not found then
    raise exception 'Import batch not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to import students' using errcode = '42501';
  end if;
  if v_batch_status <> 'dry_run' then
    raise exception 'Only dry-run batches can be committed' using errcode = '22023';
  end if;
  if coalesce(v_valid, 0) < 1 then
    raise exception 'No valid rows to import' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  for v_row in
    select *
    from public.school_student_import_rows as r
    where r.batch_id = p_batch_id
    order by r.row_number
  loop
    if v_row.validation_status <> 'valid' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Re-check duplicate at commit time (race-safe)
    if exists (
      select 1 from public.school_students as s
      where s.school_id = v_school_id
        and s.student_number = v_row.student_number
    ) then
      update public.school_student_import_rows as r
      set validation_status = 'skipped',
          error_message = 'Student number already exists at commit'
      where r.id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.school_students (
      school_id, student_number, first_name, last_name, date_of_birth, gender
    )
    values (
      v_school_id,
      v_row.student_number,
      v_row.first_name,
      v_row.last_name,
      v_row.date_of_birth,
      v_row.gender
    )
    returning id into v_student_id;

    v_enrolment_id := null;
    if v_row.academic_year_name is not null and v_row.grade_name is not null then
      select y.id into v_year_id
      from public.school_academic_years as y
      where y.school_id = v_school_id
        and lower(y.name) = lower(v_row.academic_year_name)
      limit 1;

      select g.id into v_grade_id
      from public.school_grades as g
      where g.school_id = v_school_id
        and g.status = 'active'
        and lower(g.name) = lower(v_row.grade_name)
      limit 1;

      v_section_id := null;
      if v_row.section_name is not null then
        select sec.id into v_section_id
        from public.school_sections as sec
        where sec.school_id = v_school_id
          and sec.grade_id = v_grade_id
          and sec.status = 'active'
          and lower(sec.name) = lower(v_row.section_name)
        limit 1;
      end if;

      if v_year_id is not null and v_grade_id is not null then
        insert into public.school_enrolments (
          school_id, student_id, academic_year_id, grade_id, section_id
        )
        values (
          v_school_id, v_student_id, v_year_id, v_grade_id, v_section_id
        )
        returning id into v_enrolment_id;
      end if;
    end if;

    update public.school_student_import_rows as r
    set validation_status = 'imported',
        student_id = v_student_id,
        enrolment_id = v_enrolment_id,
        error_message = null
    where r.id = v_row.id;

    v_imported := v_imported + 1;
  end loop;

  update public.school_student_import_batches as b
  set status = 'committed',
      imported_count = v_imported,
      skipped_count = v_skipped,
      committed_by = v_user_id,
      committed_at = now()
  where b.id = p_batch_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student_import.committed',
    'school_student_import_batch',
    p_batch_id,
    jsonb_build_object(
      'imported_count', v_imported,
      'skipped_count', v_skipped
    ),
    'success',
    v_role,
    v_school_id
  );

  batch_id := p_batch_id;
  status := 'committed';
  imported_count := v_imported;
  skipped_count := v_skipped;
  return next;
end;
$$;

revoke all on function public.commit_school_student_import_batch(uuid)
  from public, anon;
grant execute on function public.commit_school_student_import_batch(uuid)
  to authenticated;
