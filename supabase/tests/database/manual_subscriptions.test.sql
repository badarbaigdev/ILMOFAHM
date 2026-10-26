-- Phase 9: manual SaaS subscriptions and payments
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
    'authenticated', 'authenticated', 'op.sub@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'owner.sub@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'School Owner');

insert into public.platform_operators (user_id, role, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'operator', 'active');

insert into public.schools (id, name, slug, status, institution_type)
values (
  '11111111-1111-1111-1111-111111111111',
  'Sub School',
  'sub-school',
  'pending_setup',
  'school'
);

insert into public.school_memberships (school_id, user_id, role, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'owner',
  'active'
);

-- Public can read active public plans
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select isnt_empty(
  $$ select id from public.subscription_plans where id = 'starter' $$,
  'anon can read public active plans'
);

-- School owner cannot assign subscription
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select * from public.assign_school_subscription(
      '11111111-1111-1111-1111-111111111111',
      'growth',
      'active'
    )
  $$,
  '42501',
  'Not authorized',
  'school owner cannot assign subscription'
);

-- Operator can assign
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select * from public.assign_school_subscription(
      '11111111-1111-1111-1111-111111111111',
      'growth',
      'active',
      'monthly',
      'Billing Contact',
      'billing@sub-school.test',
      'Manual pilot'
    )
  $$,
  'operator can assign subscription'
);

select results_eq(
  $$
    select plan_id, status, is_current
    from public.school_subscriptions
    where school_id = '11111111-1111-1111-1111-111111111111'
      and is_current
  $$,
  $$ values ('growth'::text, 'active'::text, true) $$,
  'current subscription is growth/active'
);

-- Ensure trial is idempotent when current already exists
select results_eq(
  $$
    select public.ensure_school_trial_subscription(
      '11111111-1111-1111-1111-111111111111',
      'starter',
      30
    ) = (
      select id from public.school_subscriptions
      where school_id = '11111111-1111-1111-1111-111111111111'
        and is_current
    )
  $$,
  $$ values (true) $$,
  'ensure_school_trial_subscription is idempotent with current row'
);

select is(
  (
    select count(*)::int
    from public.school_subscriptions
    where school_id = '11111111-1111-1111-1111-111111111111'
      and is_current
  ),
  1,
  'at most one current subscription per school'
);

-- Record payment
select lives_ok(
  $$
    select * from public.record_subscription_payment(
      (select id from public.school_subscriptions
       where school_id = '11111111-1111-1111-1111-111111111111'
         and is_current),
      15000.00,
      'PKR',
      'bank_transfer',
      'RCPT-001',
      'Pilot payment',
      now(),
      '2026-10-01'::date,
      '2026-10-31'::date,
      'idem-sub-pay-001',
      true
    )
  $$,
  'operator can record payment'
);

-- Idempotent payment
select results_eq(
  $$
    select already_recorded, status
    from public.record_subscription_payment(
      (select id from public.school_subscriptions
       where school_id = '11111111-1111-1111-1111-111111111111'
         and is_current),
      15000.00,
      'PKR',
      'bank_transfer',
      'RCPT-001',
      'Pilot payment',
      now(),
      '2026-10-01'::date,
      '2026-10-31'::date,
      'idem-sub-pay-001',
      true
    )
  $$,
  $$ values (true, 'confirmed'::text) $$,
  'payment idempotency key returns existing row'
);

select is(
  (
    select count(*)::int from public.subscription_payments
    where school_id = '11111111-1111-1111-1111-111111111111'
  ),
  1,
  'idempotent payment does not duplicate rows'
);

-- School owner cannot read payments (operator-only SELECT policy)
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select is_empty(
  $$ select id from public.subscription_payments $$,
  'school owner cannot select SaaS payment rows'
);

-- Operator can void
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.void_subscription_payment(
      (select id from public.subscription_payments
       where school_id = '11111111-1111-1111-1111-111111111111'),
      'Entered against wrong school'
    )
  $$,
  'operator can void payment'
);

select results_eq(
  $$
    select status from public.subscription_payments
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('voided'::text) $$,
  'payment status becomes voided'
);

-- Status change
select lives_ok(
  $$
    select * from public.set_school_subscription_status(
      (select id from public.school_subscriptions
       where school_id = '11111111-1111-1111-1111-111111111111'
         and is_current),
      'past_due',
      'Awaiting bank confirmation'
    )
  $$,
  'operator can set subscription status'
);

reset role;
select ok(
  exists(
    select 1 from public.audit_events
    where action = 'platform.payment.recorded'
      and school_id = '11111111-1111-1111-1111-111111111111'
  ),
  'payment record writes audit event'
);

select * from finish();
rollback;
