-- ILM-ACA-001: Academic years and terms allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

reset role;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'owner-aca001@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'owner-b-aca001@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated',
    'authenticated',
    'teacher-aca001@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher A');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'School A',
    'school-a-aca001',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-aca001',
    'academy',
    'active'
  );

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'owner',
    'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'teacher',
    'active'
  );

-- Owner can create academic year
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_academic_year(
      '11111111-1111-1111-1111-111111111111',
      '2026-27',
      '2026-04-01',
      '2027-03-31',
      'planned',
      true
    )
  $$,
  'owner can create academic year and set current'
);

select results_eq(
  $$
    select name, status, is_current
    from public.academic_years
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$
    values ('2026-27'::text, 'active'::text, true)
  $$,
  'make_current promotes planned year to active'
);

-- Term within year
select lives_ok(
  $$
    select public.create_academic_term(
      (select id from public.academic_years
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Term 1',
      '2026-04-01',
      '2026-08-31',
      1
    )
  $$,
  'owner can create term inside year range'
);

-- Term outside year denied
select throws_ok(
  $$
    select public.create_academic_term(
      (select id from public.academic_years
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      'Bad Term',
      '2025-01-01',
      '2025-06-01',
      2
    )
  $$,
  '22023',
  'Term dates must fall within the academic year',
  'term outside year range is rejected'
);

-- Teacher cannot create year
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select public.create_academic_year(
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
  'teacher cannot create academic year'
);

-- Teacher can read years
select isnt_empty(
  $$
    select id from public.academic_years
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'teacher can select academic years in their org'
);

-- Cross-tenant: owner B cannot create year in org A
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_academic_year(
      '11111111-1111-1111-1111-111111111111',
      'Cross Year',
      '2026-04-01',
      '2027-03-31',
      'planned',
      false
    )
  $$,
  '42501',
  'Not authorized to manage academic years',
  'cross-tenant create is denied'
);

-- Cross-tenant select: owner B cannot see org A years
select is_empty(
  $$
    select id from public.academic_years
    where organization_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select other org academic years'
);

-- Owner A can update year
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.update_academic_year(
      (select id from public.academic_years
       where organization_id = '11111111-1111-1111-1111-111111111111'
       limit 1),
      '2026-27 Updated',
      '2026-04-01',
      '2027-03-31',
      'active',
      true
    )
  $$,
  'owner can update academic year'
);

-- Audit events written
reset role;

select ok(
  exists (
    select 1 from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'academic_year.created'
  ),
  'academic_year.created audit event exists'
);

select ok(
  exists (
    select 1 from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'academic_year.updated'
  ),
  'academic_year.updated audit event exists'
);

select ok(
  exists (
    select 1 from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'academic_term.created'
  ),
  'academic_term.created audit event exists'
);

-- Direct insert denied for authenticated
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    insert into public.academic_years (
      organization_id, name, starts_on, ends_on
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'Direct Insert',
      '2028-04-01',
      '2029-03-31'
    )
  $$,
  '42501',
  null,
  'direct insert into academic_years is revoked'
);

select * from finish();

rollback;
