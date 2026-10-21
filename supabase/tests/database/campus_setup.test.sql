-- ILM-ORG-002: Campus create/update allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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
    'owner-org002@example.test',
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
    'owner-b-org002@example.test',
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
    'teacher-org002@example.test',
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
    'school-a-org002',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-org002',
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

insert into public.campuses (id, organization_id, name, code, status)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Campus A1',
    'A1',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Campus B1',
    'B1',
    'active'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name, code, status
    from public.create_organization_campus(
      '11111111-1111-1111-1111-111111111111',
      'Campus A2',
      'A2',
      '+92-21-0000000',
      'a2@school-a.example.test',
      'Block 5'
    )
  $$,
  $$
    values ('Campus A2'::text, 'A2'::text, 'active'::text)
  $$,
  'owner can create a campus with contact fields'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'campus.created'
  ),
  1,
  'campus create writes campus.created audit'
);

select results_eq(
  $$
    select name, status
    from public.update_organization_campus(
      '33333333-3333-3333-3333-333333333333',
      'Campus A1 North',
      'A1',
      null,
      null,
      'Main Road',
      'archived'
    )
  $$,
  $$
    values ('Campus A1 North'::text, 'archived'::text)
  $$,
  'owner can update and archive own campus'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'campus.updated'
  ),
  1,
  'campus update writes campus.updated audit'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.create_organization_campus(
      '11111111-1111-1111-1111-111111111111',
      'Teacher Campus',
      'T1'
    )
  $$,
  '42501',
  'Not authorized to manage campuses in this organization',
  'teacher cannot create campuses'
);

select throws_ok(
  $$
    select * from public.update_organization_campus(
      '33333333-3333-3333-3333-333333333333',
      'Hacked',
      'A1'
    )
  $$,
  '42501',
  'Not authorized to manage campuses in this organization',
  'teacher cannot update campuses'
);

-- Cross-tenant create denied
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select * from public.create_organization_campus(
      '22222222-2222-2222-2222-222222222222',
      'Stolen Campus',
      'X1'
    )
  $$,
  '42501',
  'Not authorized to manage campuses in this organization',
  'owner cannot create campus in another organization'
);

select throws_ok(
  $$
    select * from public.update_organization_campus(
      '44444444-4444-4444-4444-444444444444',
      'Stolen B',
      'B1'
    )
  $$,
  '42501',
  'Not authorized to manage campuses in this organization',
  'owner cannot update campus in another organization'
);

select throws_ok(
  $$
    select * from public.create_organization_campus(
      '11111111-1111-1111-1111-111111111111',
      'Bad Email Campus',
      'BE',
      null,
      'not-an-email',
      null
    )
  $$,
  '22023',
  'Valid campus email is required when provided',
  'invalid campus email is rejected'
);

-- Hard delete revoked for authenticated
select throws_ok(
  $$
    delete from public.campuses
    where id = '33333333-3333-3333-3333-333333333333'
  $$,
  '42501',
  null,
  'authenticated cannot hard-delete campuses'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select * from public.create_organization_campus(
      '11111111-1111-1111-1111-111111111111',
      'Anon Campus',
      'AN'
    )
  $$,
  '42501',
  null,
  'anon cannot create campuses'
);

select * from finish();
rollback;
