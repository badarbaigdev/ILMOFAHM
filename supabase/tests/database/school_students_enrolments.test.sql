-- Phase 11 continued: school students + enrolments allow/deny
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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
    'authenticated', 'authenticated', 'owner.stu@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.stu@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.stu@school-app.test',
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
    'Student School A', 'student-school-a', 'active',
    'owner.stu@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Student School B', 'student-school-b', 'active',
    'other.stu@school-app.test', 'school', 'Asia/Karachi', 'en'
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

-- Seed academic structure as owner A
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_school_academic_year(
      '11111111-1111-1111-1111-111111111111',
      '2026-27', '2026-04-01', '2027-03-31', 'active', true
    )
  $$,
  'seed academic year'
);

select lives_ok(
  $$
    select public.create_school_grade(
      '11111111-1111-1111-1111-111111111111',
      'Grade 5', 'G5', 5, null
    )
  $$,
  'seed grade'
);

select lives_ok(
  $$
    select public.create_school_section(
      (select id from public.school_grades
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      'A', 30, null
    )
  $$,
  'seed section'
);

select lives_ok(
  $$
    select public.create_school_student(
      '11111111-1111-1111-1111-111111111111',
      'STU-001', 'Ali', 'Khan', '2015-05-01', 'male', null
    )
  $$,
  'owner can create student'
);

select lives_ok(
  $$
    select public.create_school_enrolment(
      (select id from public.school_students
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      (select id from public.school_academic_years
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      (select id from public.school_grades
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      (select id from public.school_sections
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      '2026-04-15'
    )
  $$,
  'owner can enrol student'
);

-- Teacher denied writes, can read
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_school_student(
      '11111111-1111-1111-1111-111111111111',
      'STU-002', 'Sara', 'Ali', null, null, null
    )
  $$,
  '42501',
  'Not authorized to manage students',
  'teacher cannot create student'
);

select results_eq(
  $$
    select count(*)::integer from public.school_students
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'teacher can select students'
);

select results_eq(
  $$
    select count(*)::integer from public.school_enrolments
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'teacher can select enrolments'
);

-- Cross-tenant deny
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select is_empty(
  $$
    select id from public.school_students
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select students'
);

select throws_ok(
  $$
    select public.create_school_student(
      '11111111-1111-1111-1111-111111111111',
      'STU-X', 'Hack', 'User', null, null, null
    )
  $$,
  '42501',
  'Not authorized to manage students',
  'cross-tenant cannot create student'
);

-- Duplicate enrolment blocked
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select public.create_school_enrolment(
      (select id from public.school_students
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      (select id from public.school_academic_years
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      (select id from public.school_grades
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1),
      null,
      current_date
    )
  $$,
  '23505',
  'Student already has an active enrolment for this year',
  'duplicate active enrolment denied'
);

select lives_ok(
  $$
    select public.withdraw_school_enrolment(
      (select id from public.school_enrolments
       where school_id = '11111111-1111-1111-1111-111111111111' limit 1)
    )
  $$,
  'owner can withdraw enrolment'
);

select results_eq(
  $$
    select status from public.school_enrolments
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('withdrawn'::text) $$,
  'withdrawn status persisted'
);

select * from finish();
rollback;
