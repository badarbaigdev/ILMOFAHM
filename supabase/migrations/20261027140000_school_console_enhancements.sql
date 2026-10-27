-- School console enhancements:
-- - edit/archive grades and sections
-- - photo URLs for students, guardians, teachers (ID cards / profiles)
-- - school-media storage bucket for logos and photos

-- ---------------------------------------------------------------------------
-- Photo URL columns
-- ---------------------------------------------------------------------------

alter table public.school_students
  add column if not exists photo_url text;

alter table public.school_students
  drop constraint if exists school_students_photo_url_https;

alter table public.school_students
  add constraint school_students_photo_url_https check (
    photo_url is null or photo_url ~* '^https://[^\s]+$'
  );

alter table public.school_guardians
  add column if not exists photo_url text;

alter table public.school_guardians
  drop constraint if exists school_guardians_photo_url_https;

alter table public.school_guardians
  add constraint school_guardians_photo_url_https check (
    photo_url is null or photo_url ~* '^https://[^\s]+$'
  );

alter table public.school_teachers
  add column if not exists photo_url text;

alter table public.school_teachers
  drop constraint if exists school_teachers_photo_url_https;

alter table public.school_teachers
  add constraint school_teachers_photo_url_https check (
    photo_url is null or photo_url ~* '^https://[^\s]+$'
  );

-- ---------------------------------------------------------------------------
-- update_school_grade
-- ---------------------------------------------------------------------------

create or replace function public.update_school_grade(
  p_grade_id uuid,
  p_name text,
  p_code text default null,
  p_sort_order integer default 1
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
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_sort integer := coalesce(p_sort_order, 1);
  v_old jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_grade_id is null then
    raise exception 'grade_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Grade name is required' using errcode = '22023';
  end if;
  if v_sort < 1 then
    raise exception 'sort_order must be >= 1' using errcode = '22023';
  end if;

  select g.school_id,
         jsonb_build_object(
           'name', g.name,
           'code', g.code,
           'sort_order', g.sort_order,
           'status', g.status
         )
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

  update public.school_grades
  set name = v_name,
      code = v_code,
      sort_order = v_sort
  where id = p_grade_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.grade.updated',
    'school_grade',
    p_grade_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_name,
        'code', v_code,
        'sort_order', v_sort,
        'status', v_old->>'status'
      )
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_grade(uuid, text, text, integer)
  from public, anon;
grant execute on function public.update_school_grade(uuid, text, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_section
-- ---------------------------------------------------------------------------

create or replace function public.update_school_section(
  p_section_id uuid,
  p_name text,
  p_capacity integer default null
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
  v_name text := nullif(trim(p_name), '');
  v_old jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_section_id is null then
    raise exception 'section_id is required' using errcode = '22023';
  end if;
  if v_name is null then
    raise exception 'Section name is required' using errcode = '22023';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be >= 1' using errcode = '22023';
  end if;

  select s.school_id,
         jsonb_build_object(
           'name', s.name,
           'capacity', s.capacity,
           'status', s.status,
           'grade_id', s.grade_id
         )
  into v_school_id, v_old
  from public.school_sections as s
  where s.id = p_section_id
  for update;

  if not found then
    raise exception 'Section not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage sections' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_sections
  set name = v_name,
      capacity = p_capacity
  where id = p_section_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.section.updated',
    'school_section',
    p_section_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_name,
        'capacity', p_capacity,
        'status', v_old->>'status',
        'grade_id', v_old->>'grade_id'
      )
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_section(uuid, text, integer)
  from public, anon;
grant execute on function public.update_school_section(uuid, text, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- archive_school_section
-- ---------------------------------------------------------------------------

create or replace function public.archive_school_section(p_section_id uuid)
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

  select s.school_id,
         jsonb_build_object('name', s.name, 'status', s.status)
  into v_school_id, v_old
  from public.school_sections as s
  where s.id = p_section_id
  for update;

  if not found then
    raise exception 'Section not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage sections' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_sections set status = 'archived' where id = p_section_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.section.archived',
    'school_section',
    p_section_id,
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

revoke all on function public.archive_school_section(uuid) from public, anon;
grant execute on function public.archive_school_section(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_student
-- ---------------------------------------------------------------------------

create or replace function public.update_school_student(
  p_student_id uuid,
  p_student_number text,
  p_first_name text,
  p_last_name text,
  p_date_of_birth date default null,
  p_gender text default null,
  p_photo_url text default null
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
  v_number text := nullif(trim(p_student_number), '');
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_gender text := nullif(trim(p_gender), '');
  v_photo text := nullif(trim(p_photo_url), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_student_id is null then
    raise exception 'student_id is required' using errcode = '22023';
  end if;
  if v_number is null or v_first is null or v_last is null then
    raise exception 'Student number and name are required' using errcode = '22023';
  end if;
  if v_gender is not null
     and v_gender not in ('female', 'male', 'other', 'unspecified') then
    raise exception 'Invalid gender' using errcode = '22023';
  end if;
  if v_photo is not null and v_photo !~* '^https://[^\s]+$' then
    raise exception 'Photo URL must be an https URL' using errcode = '22023';
  end if;

  select s.school_id into v_school_id
  from public.school_students as s
  where s.id = p_student_id
  for update;

  if not found then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage students' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_students
  set student_number = v_number,
      first_name = v_first,
      last_name = v_last,
      date_of_birth = p_date_of_birth,
      gender = v_gender,
      photo_url = v_photo
  where id = p_student_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student.updated',
    'school_student',
    p_student_id,
    jsonb_build_object(
      'student_number', v_number,
      'first_name', v_first,
      'last_name', v_last
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_student(
  uuid, text, text, text, date, text, text
) from public, anon;
grant execute on function public.update_school_student(
  uuid, text, text, text, date, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_guardian
-- ---------------------------------------------------------------------------

create or replace function public.update_school_guardian(
  p_guardian_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null,
  p_photo_url text default null
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
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_photo text := nullif(trim(p_photo_url), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_guardian_id is null then
    raise exception 'guardian_id is required' using errcode = '22023';
  end if;
  if v_first is null or v_last is null then
    raise exception 'Guardian name is required' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if v_photo is not null and v_photo !~* '^https://[^\s]+$' then
    raise exception 'Photo URL must be an https URL' using errcode = '22023';
  end if;

  select g.school_id into v_school_id
  from public.school_guardians as g
  where g.id = p_guardian_id
  for update;

  if not found then
    raise exception 'Guardian not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage guardians' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_guardians
  set first_name = v_first,
      last_name = v_last,
      email = v_email,
      phone = v_phone,
      photo_url = v_photo
  where id = p_guardian_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.guardian.updated',
    'school_guardian',
    p_guardian_id,
    jsonb_build_object('first_name', v_first, 'last_name', v_last),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_guardian(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.update_school_guardian(
  uuid, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_teacher
-- ---------------------------------------------------------------------------

create or replace function public.update_school_teacher(
  p_teacher_id uuid,
  p_staff_number text,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null,
  p_primary_subject text default null,
  p_photo_url text default null
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
  v_staff text := nullif(trim(p_staff_number), '');
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_subject text := nullif(trim(p_primary_subject), '');
  v_photo text := nullif(trim(p_photo_url), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_teacher_id is null then
    raise exception 'teacher_id is required' using errcode = '22023';
  end if;
  if v_staff is null or v_first is null or v_last is null then
    raise exception 'Staff number and name are required' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if v_photo is not null and v_photo !~* '^https://[^\s]+$' then
    raise exception 'Photo URL must be an https URL' using errcode = '22023';
  end if;

  select t.school_id into v_school_id
  from public.school_teachers as t
  where t.id = p_teacher_id
  for update;

  if not found then
    raise exception 'Teacher not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage teachers' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_teachers
  set staff_number = v_staff,
      first_name = v_first,
      last_name = v_last,
      email = v_email,
      phone = v_phone,
      primary_subject = v_subject,
      photo_url = v_photo
  where id = p_teacher_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.teacher.updated',
    'school_teacher',
    p_teacher_id,
    jsonb_build_object(
      'staff_number', v_staff,
      'first_name', v_first,
      'last_name', v_last
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_teacher(
  uuid, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.update_school_teacher(
  uuid, text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: school-media (logos + photos)
-- Path: {school_id}/{kind}/{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-media',
  'school-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists school_media_select_public on storage.objects;
create policy school_media_select_public
on storage.objects
for select
to public
using (bucket_id = 'school-media');

drop policy if exists school_media_insert_manager on storage.objects;
create policy school_media_insert_manager
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-media'
  and public.is_school_manager((split_part(name, '/', 1))::uuid)
);

drop policy if exists school_media_update_manager on storage.objects;
create policy school_media_update_manager
on storage.objects
for update
to authenticated
using (
  bucket_id = 'school-media'
  and public.is_school_manager((split_part(name, '/', 1))::uuid)
)
with check (
  bucket_id = 'school-media'
  and public.is_school_manager((split_part(name, '/', 1))::uuid)
);

drop policy if exists school_media_delete_manager on storage.objects;
create policy school_media_delete_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-media'
  and public.is_school_manager((split_part(name, '/', 1))::uuid)
);
