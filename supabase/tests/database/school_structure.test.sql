-- ILM-ACA-002: School grades/sections/subjects allow/deny
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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
    'authenticated', 'authenticated', 'owner-aca002@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'owner-academy-aca002@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'teacher-aca002@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner School'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner Academy'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'School A', 'school-a-aca002', 'school', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B', 'academy-b-aca002', 'academy', 'active'
  );

insert into public.organization_memberships (
  organization_id, user_id, role, status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'owner', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'teacher', 'active'
  );

-- School owner can create grade, section, subject
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_grade(
      '11111111-1111-1111-1111-111111111111',
      'Grade 5', 'G5', 5, null
    )
  $$,
  'school owner can create grade'
);

select lives_ok(
  $$
    select public.create_section(
      (select id from public.grades
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'A', 30, null
    )
  $$,
  'school owner can create section'
);

select lives_ok(
  $$
    select public.create_subject(
      '11111111-1111-1111-1111-111111111111',
      'Mathematics', 'MATH'
    )
  $$,
  'school owner can create subject'
);

-- Academy-only org cannot create grades
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_grade(
      '22222222-2222-2222-2222-222222222222',
      'Grade 1', null, 1, null
    )
  $$,
  '22023',
  'Grades require a school or mixed institution',
  'academy-only org cannot create grades'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select public.create_grade(
      '11111111-1111-1111-1111-111111111111',
      'Grade 6', null, 6, null
    )
  $$,
  '42501',
  'Not authorized to manage grades',
  'teacher cannot create grade'
);

-- Teacher can read
select isnt_empty(
  $$
    select id from public.grades
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'teacher can select grades'
);

-- Cross-tenant deny
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select is_empty(
  $$
    select id from public.grades
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select grades'
);

select throws_ok(
  $$
    select public.create_subject(
      '11111111-1111-1111-1111-111111111111',
      'Science', null
    )
  $$,
  '42501',
  'Not authorized to manage subjects',
  'cross-tenant subject create denied'
);

-- Archive grade
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.archive_grade(
      (select id from public.grades
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1)
    )
  $$,
  'owner can archive grade'
);

select results_eq(
  $$
    select status from public.grades
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('archived'::text) $$,
  'archived grade retains row'
);

-- Audit
reset role;

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'grade.created'
      and organization_id = '11111111-1111-1111-1111-111111111111'
  ),
  'grade.created audited'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'section.created'
      and organization_id = '11111111-1111-1111-1111-111111111111'
  ),
  'section.created audited'
);

select * from finish();

rollback;
