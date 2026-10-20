-- ILM-PLAT-003: RLS allow/deny tests for tenant foundation
-- Run: supabase test db
-- Requires local Supabase with migrations applied (supabase db reset).

begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

-- ---------------------------------------------------------------------------
-- Seed as bypass role (superuser). FORCE RLS does not apply to BYPASSRLS roles.
-- ---------------------------------------------------------------------------

reset role;

-- Minimal auth.users rows for local testing (synthetic only).
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
    'owner-a@example.test',
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
    'owner-b@example.test',
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
    'teacher-a@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'suspended-a@example.test',
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
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher A'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Suspended A');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'School A',
    'school-a',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b',
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
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'staff',
    'suspended'
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

-- ---------------------------------------------------------------------------
-- Anonymous: denied at GRANT level (anon has no table privileges)
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select id from public.organizations $$,
  '42501',
  null,
  'anon cannot select organizations'
);

select throws_ok(
  $$ select id from public.campuses $$,
  '42501',
  null,
  'anon cannot select campuses'
);

select throws_ok(
  $$ select id from public.organization_memberships $$,
  '42501',
  null,
  'anon cannot select memberships'
);

select throws_ok(
  $$ insert into public.campuses (organization_id, name)
     values ('11111111-1111-1111-1111-111111111111', 'Anon Campus') $$,
  '42501',
  null,
  'anon cannot insert campuses'
);

-- ---------------------------------------------------------------------------
-- Owner A: same-tenant allow / cross-tenant deny
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select name from public.organizations order by name $$,
  $$ values ('School A') $$,
  'owner A sees only own organization'
);

select results_eq(
  $$ select name from public.campuses order by name $$,
  $$ values ('Campus A1') $$,
  'owner A sees only own campuses'
);

select lives_ok(
  $$ update public.organizations
     set name = 'School A Renamed'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'owner A can update own organization'
);

select results_eq(
  $$ update public.organizations
     set name = 'Hacked B'
     where id = '22222222-2222-2222-2222-222222222222'
     returning name $$,
  $$ select name from public.organizations where false $$,
  'owner A cannot update organization B'
);

select throws_ok(
  $$ update public.campuses
     set organization_id = '22222222-2222-2222-2222-222222222222'
     where id = '33333333-3333-3333-3333-333333333333' $$,
  '23514',
  null,
  'owner A cannot reassign campus organization_id'
);

select lives_ok(
  $$ insert into public.campuses (organization_id, name, code)
     values (
       '11111111-1111-1111-1111-111111111111',
       'Campus A2',
       'A2'
     ) $$,
  'owner A can insert campus in own organization'
);

-- ---------------------------------------------------------------------------
-- Teacher A (active member, not manager)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

select results_eq(
  $$ select name from public.campuses where organization_id = '11111111-1111-1111-1111-111111111111' order by name $$,
  $$ values ('Campus A1'), ('Campus A2') $$,
  'teacher A can select campuses in own organization'
);

select throws_ok(
  $$ insert into public.campuses (organization_id, name, code)
     values (
       '11111111-1111-1111-1111-111111111111',
       'Teacher Campus',
       'T1'
     ) $$,
  '42501',
  null,
  'teacher A cannot insert campuses'
);

select is_empty(
  $$ select id from public.organizations where id = '22222222-2222-2222-2222-222222222222' $$,
  'teacher A cannot select organization B'
);

-- ---------------------------------------------------------------------------
-- Suspended member loses tenant visibility
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);

select is_empty(
  $$ select id from public.organizations $$,
  'suspended member cannot select organizations'
);

select is_empty(
  $$ select id from public.campuses $$,
  'suspended member cannot select campuses'
);

-- ---------------------------------------------------------------------------
-- Owner B cannot mutate organization A memberships / campuses
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select throws_ok(
  $$ insert into public.organization_memberships (
       organization_id, user_id, role, status
     ) values (
       '11111111-1111-1111-1111-111111111111',
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       'admin',
       'active'
     ) $$,
  '42501',
  null,
  'owner B cannot insert membership into organization A'
);

select results_eq(
  $$ update public.campuses
     set name = 'Taken'
     where id = '33333333-3333-3333-3333-333333333333'
     returning name $$,
  $$ select name from public.campuses where false $$,
  'owner B cannot update campus in organization A'
);

-- ---------------------------------------------------------------------------
-- Profiles: own only
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

-- Active org colleagues are visible for member directories (ILM-PLAT-006).
-- Cross-tenant profiles remain hidden.
select results_eq(
  $$ select full_name from public.profiles
     where id in (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'cccccccc-cccc-cccc-cccc-cccccccccccc',
       'dddddddd-dddd-dddd-dddd-dddddddddddd'
     )
     order by full_name $$,
  $$ values ('Owner A'), ('Suspended A'), ('Teacher A') $$,
  'active member sees colleague profiles in the same organization'
);

select is_empty(
  $$ select id from public.profiles
     where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'user cannot select a profile from another organization'
);

select * from finish();
rollback;
