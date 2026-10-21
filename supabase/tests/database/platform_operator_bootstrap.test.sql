-- Phase 3: Platform operator bootstrap + status allow/deny
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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
    'authenticated', 'authenticated', 'first-op@bootstrap.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'second-op@bootstrap.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'school-user@bootstrap.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'First Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Second Operator'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'School User');

-- Bootstrap available before any active operator
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.platform_bootstrap_available(),
  true,
  'bootstrap is available when no active operators exist'
);

select lives_ok(
  $$ select public.bootstrap_first_platform_operator() $$,
  'first authenticated user can bootstrap as platform operator'
);

select is(
  public.is_platform_operator(),
  true,
  'bootstrapped user is an active platform operator'
);

select is(
  public.platform_bootstrap_available(),
  false,
  'bootstrap window closes after first active operator'
);

-- Second user cannot bootstrap
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$ select public.bootstrap_first_platform_operator() $$,
  '42501',
  null,
  'second user cannot bootstrap after an active operator exists'
);

select is(
  public.is_platform_operator(),
  false,
  'second user is not a platform operator after denied bootstrap'
);

-- School user cannot insert platform_operators directly
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    insert into public.platform_operators (user_id, role, status)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'operator',
      'active'
    )
  $$,
  '42501',
  null,
  'school user cannot self-promote via direct insert'
);

select throws_ok(
  $$
    select public.set_platform_operator_status(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'revoked'
    )
  $$,
  '42501',
  null,
  'school user cannot revoke operators'
);

-- First operator adds second via bypass insert, then manages status
reset role;

insert into public.platform_operators (user_id, role, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'operator',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.set_platform_operator_status(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'suspended'
    )
  $$,
  'active operator can suspend another operator'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select is(
  public.is_platform_operator(),
  false,
  'suspended operator is not treated as active'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.set_platform_operator_status(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'revoked'
    )
  $$,
  'active operator can revoke a suspended operator'
);

-- Cannot remove last active operator
select throws_ok(
  $$
    select public.set_platform_operator_status(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'revoked'
    )
  $$,
  'P0001',
  null,
  'cannot revoke the last active platform operator'
);

-- Audit events recorded for bootstrap / status change
reset role;

select isnt_empty(
  $$
    select id from public.audit_events
    where action = 'platform.operator.bootstrap'
      and target_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'bootstrap writes an audit event'
);

select isnt_empty(
  $$
    select id from public.audit_events
    where action = 'platform.operator.status_change'
      and target_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  'status changes write audit events'
);

select * from finish();

rollback;
