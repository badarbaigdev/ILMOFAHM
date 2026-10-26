-- Phase 11: school student CSV import dry-run + commit
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

reset role;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'owner.imp@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.imp@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.imp@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Teacher'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Other');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Import School A', 'import-school-a', 'active',
    'owner.imp@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Import School B', 'import-school-b', 'active',
    'other.imp@school-app.test', 'school', 'Asia/Karachi', 'en'
  );

insert into public.school_memberships (school_id, user_id, role, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'teacher', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'owner', 'active'
  );

insert into public.school_academic_years (
  id, school_id, name, starts_on, ends_on, status, is_current
)
values (
  'aaaaaaaa-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '2026-27', '2026-04-01', '2027-03-31', 'active', true
);

insert into public.school_grades (
  id, school_id, name, code, sort_order, status
)
values (
  'bbbbbbbb-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Grade 1', 'G1', 1, 'active'
);

insert into public.school_sections (
  id, school_id, grade_id, name, status
)
values (
  'cccccccc-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-1111-4111-8111-111111111111',
  'A', 'active'
);

insert into public.school_students (
  id, school_id, student_number, first_name, last_name, status
)
values (
  'dddddddd-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'EXIST-001', 'Existing', 'Student', 'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_school_student_import_dry_run(
      '11111111-1111-1111-1111-111111111111',
      'students.csv',
      jsonb_build_array(
        jsonb_build_object(
          'row_number', 1,
          'student_number', 'IMP-001',
          'first_name', 'Sara',
          'last_name', 'Ali',
          'date_of_birth', '2015-05-01',
          'gender', 'female',
          'academic_year_name', '2026-27',
          'grade_name', 'Grade 1',
          'section_name', 'A'
        ),
        jsonb_build_object(
          'row_number', 2,
          'student_number', 'EXIST-001',
          'first_name', 'Dup',
          'last_name', 'Name'
        ),
        jsonb_build_object(
          'row_number', 3,
          'student_number', '',
          'first_name', 'Bad',
          'last_name', 'Row'
        )
      )
    )
  $$,
  'owner can dry-run import'
);

select results_eq(
  $$
    select valid_count, error_count, duplicate_count
    from public.school_student_import_batches
    where school_id = '11111111-1111-1111-1111-111111111111'
    order by created_at desc
    limit 1
  $$,
  $$ values (1, 1, 1) $$,
  'dry-run counts valid/error/duplicate'
);

select lives_ok(
  $$
    select public.commit_school_student_import_batch(
      (select id from public.school_student_import_batches
       where school_id = '11111111-1111-1111-1111-111111111111'
       order by created_at desc limit 1)
    )
  $$,
  'owner can commit valid rows'
);

select results_eq(
  $$
    select count(*)::integer from public.school_students
    where school_id = '11111111-1111-1111-1111-111111111111'
      and student_number = 'IMP-001'
  $$,
  $$ values (1) $$,
  'commit creates student'
);

select results_eq(
  $$
    select count(*)::integer from public.school_enrolments e
    join public.school_students s on s.id = e.student_id
    where s.student_number = 'IMP-001'
      and e.status = 'enrolled'
  $$,
  $$ values (1) $$,
  'commit creates enrolment when year/grade provided'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_school_student_import_dry_run(
      '11111111-1111-1111-1111-111111111111',
      'x.csv',
      jsonb_build_array(
        jsonb_build_object(
          'row_number', 1,
          'student_number', 'T-1',
          'first_name', 'T',
          'last_name', 'Each'
        )
      )
    )
  $$,
  '42501',
  'Not authorized to import students',
  'teacher cannot dry-run import'
);

select results_eq(
  $$
    select count(*)::integer from public.school_student_import_batches
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'teacher can select import batches'
);

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select is_empty(
  $$
    select id from public.school_student_import_batches
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select import batches'
);

select throws_ok(
  $$
    select public.create_school_student_import_dry_run(
      '11111111-1111-1111-1111-111111111111',
      'x.csv',
      jsonb_build_array(
        jsonb_build_object(
          'row_number', 1,
          'student_number', 'X-1',
          'first_name', 'X',
          'last_name', 'Y'
        )
      )
    )
  $$,
  '42501',
  'Not authorized to import students',
  'cross-tenant cannot dry-run import'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select public.commit_school_student_import_batch(
      (select id from public.school_student_import_batches
       where school_id = '11111111-1111-1111-1111-111111111111'
       order by created_at desc limit 1)
    )
  $$,
  '22023',
  'Only dry-run batches can be committed',
  'cannot re-commit batch'
);

select * from finish();
rollback;
