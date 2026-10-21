-- ILM-ACA-003: Academy courses/cohorts allow/deny
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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
    'authenticated', 'authenticated', 'owner-aca003@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'owner-school-aca003@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'teacher-aca003@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner Academy'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner School'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Academy A', 'academy-a-aca003', 'academy', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'School B', 'school-b-aca003', 'school', 'active'
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

-- Academy owner can create course and cohort without grades
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_course(
      '11111111-1111-1111-1111-111111111111',
      'Quran Memorization', 'QM', 'Hifz track', null
    )
  $$,
  'academy owner can create course'
);

select lives_ok(
  $$
    select public.create_cohort(
      (select id from public.courses
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Batch A',
      '2026-04-01',
      '2026-12-31',
      25,
      null,
      null,
      'planned'
    )
  $$,
  'academy owner can create cohort with capacity'
);

-- School-only cannot create courses
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_course(
      '22222222-2222-2222-2222-222222222222',
      'Should Fail', null, null, null
    )
  $$,
  '22023',
  'Courses require an academy or mixed institution',
  'school-only org cannot create courses'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select public.create_course(
      '11111111-1111-1111-1111-111111111111',
      'Extra Course', null, null, null
    )
  $$,
  '42501',
  'Not authorized to manage courses',
  'teacher cannot create course'
);

select isnt_empty(
  $$
    select id from public.courses
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'teacher can select courses'
);

-- Cross-tenant
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select is_empty(
  $$
    select id from public.courses
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select courses'
);

-- Use a known course UUID (SECURITY DEFINER finds it; manager check denies).
reset role;

insert into public.courses (id, organization_id, name, status)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Cross Tenant Course',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.create_cohort(
      '33333333-3333-3333-3333-333333333333',
      'Bad Batch', null, null, null, null, null, 'planned'
    )
  $$,
  '42501',
  'Not authorized to manage cohorts',
  'cross-tenant cohort create denied'
);

-- Invalid capacity
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select public.create_cohort(
      (select id from public.courses
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Bad Cap', null, null, 0, null, null, 'planned'
    )
  $$,
  '22023',
  'capacity must be >= 1',
  'cohort capacity must be positive'
);

-- Archive course
select lives_ok(
  $$
    select public.archive_course(
      (select id from public.courses
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1)
    )
  $$,
  'owner can archive course'
);

reset role;

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'course.created'
      and organization_id = '11111111-1111-1111-1111-111111111111'
  ),
  'course.created audited'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'cohort.created'
      and organization_id = '11111111-1111-1111-1111-111111111111'
  ),
  'cohort.created audited'
);

select * from finish();

rollback;
