-- Phase 11: school guardians + student links
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
    'authenticated', 'authenticated', 'owner.guard@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.guard@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.guard@school-app.test',
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
    'Guard School A', 'guard-school-a', 'active',
    'owner.guard@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Guard School B', 'guard-school-b', 'active',
    'other.guard@school-app.test', 'school', 'Asia/Karachi', 'en'
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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Insert with known IDs so cross-tenant tests do not rely on RLS-visible selects.
reset role;

insert into public.school_students (
  id, school_id, student_number, first_name, last_name
)
values (
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'G-001', 'Noor', 'Ahmed'
);

insert into public.school_guardians (
  id, school_id, first_name, last_name, email, phone
)
values (
  '88888888-8888-4888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  'Fatima', 'Ahmed', 'fatima@example.test', '+92 300 1111111'
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
    select public.create_school_guardian(
      '11111111-1111-1111-1111-111111111111',
      'Second', 'Contact', 'second@example.test', null
    )
  $$,
  'owner can create guardian'
);

select lives_ok(
  $$
    select public.link_school_student_guardian(
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
      'mother',
      true
    )
  $$,
  'owner can link guardian to student'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_school_guardian(
      '11111111-1111-1111-1111-111111111111',
      'X', 'Y', null, null
    )
  $$,
  '42501',
  'Not authorized to manage guardians',
  'teacher cannot create guardian'
);

select results_eq(
  $$
    select count(*)::integer from public.school_guardians
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (2) $$,
  'teacher can select guardians'
);

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select is_empty(
  $$
    select id from public.school_guardians
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select guardians'
);

select throws_ok(
  $$
    select public.link_school_student_guardian(
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
      'father',
      false
    )
  $$,
  '42501',
  'Not authorized to manage guardians',
  'cross-tenant cannot link guardian'
);

-- Cross-school link blocked: create guardian in B with known id
reset role;
insert into public.school_guardians (
  id, school_id, first_name, last_name
)
values (
  '99999999-9999-4999-8999-999999999999',
  '22222222-2222-2222-2222-222222222222',
  'Other', 'Parent'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.link_school_student_guardian(
      '77777777-7777-4777-8777-777777777777',
      '99999999-9999-4999-8999-999999999999',
      'other',
      false
    )
  $$,
  '22023',
  'Student and guardian must belong to the same school',
  'cannot link across schools (same-school check)'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select public.link_school_student_guardian(
      '77777777-7777-4777-8777-777777777777',
      '99999999-9999-4999-8999-999999999999',
      'other',
      false
    )
  $$,
  '22023',
  'Student and guardian must belong to the same school',
  'same-tenant manager still cannot cross-link schools'
);

select lives_ok(
  $$
    select public.unlink_school_student_guardian(
      (select id from public.school_student_guardians
       where school_id = '11111111-1111-1111-1111-111111111111'
         and status = 'active'
       limit 1)
    )
  $$,
  'owner can unlink guardian'
);

select * from finish();
rollback;
