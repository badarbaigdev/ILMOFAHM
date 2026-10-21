-- ILM-ORG-001: Organization profile update allow/deny tests
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
    'owner-org001@example.test',
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
    'owner-b-org001@example.test',
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
    'teacher-org001@example.test',
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
    'school-a-org001',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-org001',
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

-- Manager can update own org profile
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name, institution_type
    from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'School A Renamed',
      'both'
    )
  $$,
  $$
    values ('School A Renamed'::text, 'both'::text)
  $$,
  'owner can update own organization name and institution_type'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'organization.profile_updated'
  ),
  1,
  'profile update writes organization.profile_updated audit'
);

-- Teacher cannot update
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'Hacked',
      'academy'
    )
  $$,
  '42501',
  'Not authorized to update this organization',
  'teacher cannot update organization profile'
);

-- Cross-tenant denied (owner A → org B)
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_profile(
      '22222222-2222-2222-2222-222222222222',
      'Stolen',
      'school'
    )
  $$,
  '42501',
  'Not authorized to update this organization',
  'owner cannot update another organization profile'
);

-- Invalid institution_type rejected
select throws_ok(
  $$
    select * from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'School A Renamed',
      'college'
    )
  $$,
  '22023',
  'Invalid institution_type',
  'invalid institution_type is rejected'
);

-- Short name rejected
select throws_ok(
  $$
    select * from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'A',
      'school'
    )
  $$,
  '22023',
  'Organization name must be at least 2 characters',
  'short organization name is rejected'
);

-- Direct status change blocked by trigger (manager RLS would otherwise allow)
select throws_ok(
  $$
    update public.organizations
    set status = 'suspended'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  'organizations.status cannot be changed via Data API',
  'status cannot be changed via Data API update'
);

-- Direct slug change blocked
select throws_ok(
  $$
    update public.organizations
    set slug = 'hijacked-slug'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  'organizations.slug cannot be changed via Data API',
  'slug cannot be changed via Data API update'
);

-- Cross-tenant direct update affects zero rows (RLS)
select lives_ok(
  $$
    update public.organizations
    set name = 'Should Not Apply'
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  'cross-tenant direct name update is silently filtered by RLS'
);

-- Assert as bypass role (SELECT under owner A RLS cannot see org B).
reset role;
select is(
  (
    select name
    from public.organizations
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  'Academy B',
  'cross-tenant direct name update leaves target unchanged'
);

-- Anon cannot call RPC (no EXECUTE grant)
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$
    select * from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'Anon',
      'school'
    )
  $$,
  '42501',
  null,
  'anon cannot update organization profile'
);

-- Persisted values remain after denials
reset role;
select is(
  (
    select name
    from public.organizations
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'School A Renamed',
  'allowed profile update persisted'
);

select is(
  (
    select institution_type
    from public.organizations
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  'academy',
  'other tenant institution_type unchanged'
);

select * from finish();
rollback;
