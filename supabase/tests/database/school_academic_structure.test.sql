-- Phase 11: school academic years/terms + grades/sections/subjects
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

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
    'authenticated', 'authenticated', 'owner.aca11@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.aca11@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.aca11@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated', 'authenticated', 'academy.aca11@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'School Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'School Teacher'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Other Owner'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Academy Owner');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Academic School A',
    'academic-school-a',
    'active',
    'owner.aca11@school-app.test',
    'school',
    'Asia/Karachi',
    'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academic School B',
    'academic-school-b',
    'active',
    'other.aca11@school-app.test',
    'school',
    'Asia/Karachi',
    'en'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Academic Academy C',
    'academic-academy-c',
    'active',
    'academy.aca11@school-app.test',
    'academy',
    'Asia/Karachi',
    'en'
  );

insert into public.school_memberships (
  school_id, user_id, role, status
)
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
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'owner', 'active'
  );

-- Owner can create academic year (make current)
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
      '2026-27',
      '2026-04-01',
      '2027-03-31',
      'planned',
      true
    )
  $$,
  'school owner can create academic year and set current'
);

select results_eq(
  $$
    select name, status, is_current
    from public.school_academic_years
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$
    values ('2026-27'::text, 'active'::text, true)
  $$,
  'make_current promotes planned school year to active'
);

select lives_ok(
  $$
    select public.create_school_academic_term(
      (select id from public.school_academic_years
       where school_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Term 1',
      '2026-04-01',
      '2026-09-30',
      1
    )
  $$,
  'school owner can create term within year'
);

select lives_ok(
  $$
    select public.create_school_grade(
      '11111111-1111-1111-1111-111111111111',
      'Grade 5', 'G5', 5, null
    )
  $$,
  'school owner can create grade'
);

select lives_ok(
  $$
    select public.create_school_section(
      (select id from public.school_grades
       where school_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'A', 30, null
    )
  $$,
  'school owner can create section'
);

select lives_ok(
  $$
    select public.create_school_subject(
      '11111111-1111-1111-1111-111111111111',
      'Mathematics', 'MATH'
    )
  $$,
  'school owner can create subject'
);

-- Teacher denied writes
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_school_academic_year(
      '11111111-1111-1111-1111-111111111111',
      '2027-28',
      '2027-04-01',
      '2028-03-31',
      'planned',
      false
    )
  $$,
  '42501',
  'Not authorized to manage academic years',
  'teacher cannot create school academic year'
);

select throws_ok(
  $$
    select public.create_school_grade(
      '11111111-1111-1111-1111-111111111111',
      'Grade 6', null, 6, null
    )
  $$,
  '42501',
  'Not authorized to manage grades',
  'teacher cannot create school grade'
);

-- Teacher can read own school rows
select results_eq(
  $$
    select count(*)::integer
    from public.school_academic_years
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'teacher can select school academic years'
);

select results_eq(
  $$
    select count(*)::integer
    from public.school_grades
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'teacher can select school grades'
);

-- Cross-tenant: other school owner cannot write or read school A
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select public.create_school_subject(
      '11111111-1111-1111-1111-111111111111',
      'Science', 'SCI'
    )
  $$,
  '42501',
  'Not authorized to manage subjects',
  'cross-tenant owner cannot create subject in another school'
);

select is_empty(
  $$
    select id from public.school_academic_years
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant owner cannot select other school academic years'
);

select is_empty(
  $$
    select id from public.school_grades
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant owner cannot select other school grades'
);

-- Direct insert blocked (RPC-only writes)
select throws_ok(
  $$
    insert into public.school_academic_years (
      school_id, name, starts_on, ends_on
    ) values (
      '22222222-2222-2222-2222-222222222222',
      'Direct',
      '2026-01-01',
      '2026-12-31'
    )
  $$,
  '42501',
  null,
  'direct insert into school_academic_years is denied'
);

-- Academy owner: years ok, grades blocked
select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  true
);

select lives_ok(
  $$
    select public.create_school_academic_year(
      '33333333-3333-3333-3333-333333333333',
      '2026 Session',
      '2026-01-01',
      '2026-12-31',
      'active',
      true
    )
  $$,
  'academy owner can create academic year'
);

select throws_ok(
  $$
    select public.create_school_grade(
      '33333333-3333-3333-3333-333333333333',
      'Grade 1', null, 1, null
    )
  $$,
  '22023',
  'Grades require a school or mixed institution',
  'academy institution cannot create grades'
);

-- Term dates outside year rejected
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select public.create_school_academic_term(
      (select id from public.school_academic_years
       where school_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Bad Term',
      '2025-01-01',
      '2025-06-30',
      2
    )
  $$,
  '22023',
  'Term dates must fall within the academic year',
  'term outside year dates is rejected'
);

-- Archive grade
select lives_ok(
  $$
    select public.archive_school_grade(
      (select id from public.school_grades
       where school_id = '11111111-1111-1111-1111-111111111111'
       limit 1)
    )
  $$,
  'school owner can archive grade'
);

select results_eq(
  $$
    select status from public.school_grades
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('archived'::text) $$,
  'archived grade status is archived'
);

select * from finish();
rollback;
