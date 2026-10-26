-- Phase 11: school fee heads, charges, payments
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
    'authenticated', 'authenticated', 'owner.fee@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'acct.fee@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'teacher.fee@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated', 'authenticated', 'other.fee@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Accountant'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Other');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Fee School A', 'fee-school-a', 'active',
    'owner.fee@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Fee School B', 'fee-school-b', 'active',
    'other.fee@school-app.test', 'school', 'Asia/Karachi', 'en'
  );

insert into public.school_memberships (school_id, user_id, role, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'accountant', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'teacher', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'owner', 'active'
  );

reset role;

insert into public.school_students (
  id, school_id, student_number, first_name, last_name
)
values (
  '77777777-7777-4777-8777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'F-001', 'Noor', 'Ahmed'
);

insert into public.school_fee_heads (
  id, school_id, code, name, default_amount
)
values (
  '88888888-8888-4888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  'TUITION', 'Monthly tuition', 5000.00
);

insert into public.school_fee_charges (
  id, school_id, student_id, fee_head_id, amount, due_date, status
)
values (
  '99999999-9999-4999-8999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  5000.00, '2026-11-01', 'due'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.create_school_fee_head(
      '11111111-1111-1111-1111-111111111111',
      'transport', 'Transport', 1500.00
    )
  $$,
  'owner can create fee head'
);

select lives_ok(
  $$
    select public.create_school_fee_charge(
      '11111111-1111-1111-1111-111111111111',
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',
      2500.00,
      '2026-12-01'
    )
  $$,
  'owner can create fee charge'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select lives_ok(
  $$
    select public.record_school_fee_payment(
      '99999999-9999-4999-8999-999999999999',
      2000.00,
      'cash',
      'RCPT-001',
      '2026-10-20',
      'idem-partial-1',
      null
    )
  $$,
  'accountant can record partial payment'
);

select results_eq(
  $$
    select status, amount_paid from public.school_fee_charges
    where id = '99999999-9999-4999-8999-999999999999'
  $$,
  $$ values ('partial'::text, 2000.00::numeric) $$,
  'partial payment updates charge'
);

select lives_ok(
  $$
    select public.record_school_fee_payment(
      '99999999-9999-4999-8999-999999999999',
      3000.00,
      'bank_transfer',
      'RCPT-002',
      '2026-10-21',
      'idem-full-1',
      null
    )
  $$,
  'accountant can complete payment'
);

select results_eq(
  $$
    select status, amount_paid from public.school_fee_charges
    where id = '99999999-9999-4999-8999-999999999999'
  $$,
  $$ values ('paid'::text, 5000.00::numeric) $$,
  'full payment marks charge paid'
);

-- Idempotent replay returns without duplicating
select lives_ok(
  $$
    select public.record_school_fee_payment(
      '99999999-9999-4999-8999-999999999999',
      3000.00,
      'bank_transfer',
      'RCPT-002',
      '2026-10-21',
      'idem-full-1',
      null
    )
  $$,
  'idempotent payment key replays safely'
);

select results_eq(
  $$
    select count(*)::integer from public.school_fee_payments
    where charge_id = '99999999-9999-4999-8999-999999999999'
  $$,
  $$ values (2) $$,
  'idempotent replay does not insert a third payment'
);

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select public.create_school_fee_head(
      '11111111-1111-1111-1111-111111111111',
      'X', 'Y', 1
    )
  $$,
  '42501',
  'Not authorized to manage fees',
  'teacher cannot manage fees'
);

select results_eq(
  $$
    select count(*)::integer from public.school_fee_charges
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (2) $$,
  'teacher can select fee charges'
);

select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  true
);

select is_empty(
  $$
    select id from public.school_fee_charges
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select fee charges'
);

select throws_ok(
  $$
    select public.record_school_fee_payment(
      '99999999-9999-4999-8999-999999999999',
      1.00,
      'cash',
      'RCPT-X',
      current_date,
      null,
      null
    )
  $$,
  '42501',
  'Not authorized to manage fees',
  'cross-tenant cannot record payment'
);

select * from finish();
rollback;
