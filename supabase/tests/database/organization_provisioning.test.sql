-- ILM-PLAT-005: Atomic first-owner provisioning allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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
    'owner-new@example.test',
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
    'owner-other@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

-- ---------------------------------------------------------------------------
-- Anonymous cannot execute provisioning RPC
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.create_organization_with_owner(
       'Anon School',
       'school',
       '99999999-9999-9999-9999-999999999999'
     ) $$,
  '42501',
  null,
  'anon cannot execute create_organization_with_owner'
);

-- ---------------------------------------------------------------------------
-- Authenticated first-owner provision is atomic and readable afterwards
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select already_provisioned
     from public.create_organization_with_owner(
       'Green Valley School',
       'school',
       '11111111-1111-1111-1111-111111111101',
       'green-valley',
       'Asia/Karachi',
       'en',
       'Main campus'
     ) $$,
  $$ values (false) $$,
  'first provision creates a new organization'
);

select results_eq(
  $$ select o.name, m.role, m.status, c.name
     from public.organizations as o
     join public.organization_memberships as m
       on m.organization_id = o.id
     join public.campuses as c
       on c.organization_id = o.id
     where o.slug = 'green-valley'
       and m.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  $$ values ('Green Valley School', 'owner', 'active', 'Main campus') $$,
  'owner can read provisioned org, membership, and campus'
);

select results_eq(
  $$ select already_provisioned, organization_id
     from public.create_organization_with_owner(
       'Green Valley School RETRY',
       'school',
       '11111111-1111-1111-1111-111111111101',
       'green-valley-retry',
       'Asia/Karachi',
       'en',
       'Other campus'
     ) $$,
  $$ select true, id
     from public.organizations
     where slug = 'green-valley' $$,
  'retry with same idempotency key returns prior organization'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where slug in ('green-valley', 'green-valley-retry')
  ),
  1,
  'retry does not create a duplicate organization'
);

select throws_ok(
  $$ select * from public.create_organization_with_owner(
       '',
       'school',
       '11111111-1111-1111-1111-111111111102'
     ) $$,
  '22023',
  null,
  'blank organization name is rejected'
);

select throws_ok(
  $$ select * from public.create_organization_with_owner(
       'Bad Type Org',
       'kiosk',
       '11111111-1111-1111-1111-111111111103'
     ) $$,
  '22023',
  null,
  'invalid institution_type is rejected'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where name = 'Bad Type Org'
  ),
  0,
  'failed provision leaves no organization row'
);

-- Direct table insert remains denied (RPC-only bootstrap)
select throws_ok(
  $$ insert into public.organizations (name, institution_type)
     values ('Direct Insert Org', 'school') $$,
  '42501',
  null,
  'authenticated cannot insert organizations directly'
);

-- ---------------------------------------------------------------------------
-- Cross-user idempotency key reuse is denied
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select throws_ok(
  $$ select * from public.create_organization_with_owner(
       'Hijack Attempt',
       'academy',
       '11111111-1111-1111-1111-111111111101'
     ) $$,
  '42501',
  null,
  'another user cannot reuse someone else''s idempotency key'
);

select is_empty(
  $$ select id from public.organizations where name = 'Hijack Attempt' $$,
  'cross-user key reuse leaves no organization'
);

-- Owner B can provision their own org with a fresh key
select results_eq(
  $$ select already_provisioned
     from public.create_organization_with_owner(
       'Academy B Fresh',
       'academy',
       '22222222-2222-2222-2222-222222222201'
     ) $$,
  $$ values (false) $$,
  'second user can provision with a distinct idempotency key'
);

select * from finish();
rollback;
