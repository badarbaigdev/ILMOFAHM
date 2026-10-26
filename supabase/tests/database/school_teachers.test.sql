-- Phase 11: school teachers HR directory
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

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
    'authenticated', 'authenticated', 'owner.teach@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.teach@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.teach@school-app.test',
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
    'Teach School A', 'teach-school-a', 'active',
    'owner.teach@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Teach School B', 'teach-school-b', 'active',
    'other.teach@school-app.test', 'school', 'Asia/Karachi', 'en'
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

reset role;
insert into public.school_teachers (
  id, school_id, staff_number, first_name, last_name, primary_subject
)
values (
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'T-001', 'Sara', 'Malik', 'Mathematics'
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
    select public.create_school_teacher(
      '11111111-1111-1111-1111-111111111111',
      'T-002', 'Ahmed', 'Raza', 'ahmed@example.test', '+92 300 2222222', 'Science'
    )
  $$,
  'owner can create teacher'
);

select lives_ok(
  $$
    select public.archive_school_teacher(
      '77777777-7777-4777-8777-777777777777'
    )
  $$,
  'owner can archive teacher'
);

select results_eq(
  $$
    select status from public.school_teachers
    where id = '77777777-7777-4777-8777-777777777777'
  $$,
  $$ values ('archived') $$,
  'archived teacher status updated'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_school_teacher(
      '11111111-1111-1111-1111-111111111111',
      'T-X', 'No', 'pe', null, null, null
    )
  $$,
  '42501',
  'Not authorized to manage teachers',
  'teacher role cannot create teacher HR record'
);

select results_eq(
  $$
    select count(*)::integer from public.school_teachers
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (2) $$,
  'teacher can select teachers in own school'
);

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select is_empty(
  $$
    select id from public.school_teachers
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select teachers'
);

select throws_ok(
  $$
    select public.create_school_teacher(
      '11111111-1111-1111-1111-111111111111',
      'T-Y', 'Cross', 'Tenant', null, null, null
    )
  $$,
  '42501',
  'Not authorized to manage teachers',
  'cross-tenant cannot create teacher'
);

select throws_ok(
  $$
    select public.archive_school_teacher(
      '77777777-7777-4777-8777-777777777777'
    )
  $$,
  '42501',
  'Not authorized to manage teachers',
  'cross-tenant cannot archive teacher'
);

select * from finish();
rollback;
