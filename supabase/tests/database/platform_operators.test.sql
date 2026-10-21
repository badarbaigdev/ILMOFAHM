-- Platform operator (Superadmin) allow/deny tests
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
    'authenticated', 'authenticated', 'operator@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'org-owner@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'new-owner@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Platform Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Owner'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Assigned Owner');

insert into public.platform_operators (user_id, role, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'operator',
  'active'
);

insert into public.organizations (id, name, slug, institution_type, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'Existing School',
  'existing-school-plat',
  'school',
  'active'
);

insert into public.organization_memberships (
  organization_id, user_id, role, status
)
values (
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'owner',
  'active'
);

-- Operator can list orgs and see dashboard stats
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.is_platform_operator(),
  true,
  'active operator is_platform_operator'
);

select lives_ok(
  $$ select * from public.platform_list_organizations() $$,
  'operator can list organizations'
);

select lives_ok(
  $$ select * from public.platform_dashboard_stats() $$,
  'operator can read dashboard stats'
);

select lives_ok(
  $$
    select public.platform_create_organization(
      'Platform Created Academy',
      'academy',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'platform-created-academy',
      'Asia/Karachi',
      'en',
      'Main campus'
    )
  $$,
  'operator can provision organization with owner'
);

-- Assert membership/audit as table owner (RLS hides other-tenant rows from operators).
reset role;

select ok(
  exists (
    select 1 from public.organizations
    where slug = 'platform-created-academy'
  ),
  'provisioned organization row exists'
);

select ok(
  exists (
    select 1 from public.organization_memberships
    where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      and role = 'owner'
      and status = 'active'
  ),
  'assigned user is organization owner'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'platform.organization_provisioned'
  ),
  'platform provisioning is audited'
);

-- Org owner is not a platform operator
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.is_platform_operator(),
  false,
  'org owner is not a platform operator'
);

select throws_ok(
  $$ select * from public.platform_list_organizations() $$,
  '42501',
  'Not authorized as platform operator',
  'org owner cannot list all organizations via platform RPC'
);

select throws_ok(
  $$
    select public.platform_create_organization(
      'Should Fail',
      'school',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'should-fail-org',
      'Asia/Karachi',
      'en',
      'Main campus'
    )
  $$,
  '42501',
  'Not authorized as platform operator',
  'org owner cannot provision via platform RPC'
);

-- Cross-tenant: org owner still cannot see other org via membership RLS
select is_empty(
  $$
    select id from public.organizations
    where slug = 'platform-created-academy'
  $$,
  'org owner cannot select another tenant organization'
);

-- Direct insert into platform_operators denied
select throws_ok(
  $$
    insert into public.platform_operators (user_id, role, status)
    values (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'operator',
      'active'
    )
  $$,
  '42501',
  null,
  'authenticated clients cannot insert platform_operators'
);

select * from finish();

rollback;
