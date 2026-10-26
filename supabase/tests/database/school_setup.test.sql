-- Phase 8: school setup RPCs + lifecycle protection
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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
    'authenticated', 'authenticated', 'owner.setup@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.setup@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.setup@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Setup Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Setup Teacher'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Other School Owner');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Setup School A',
    'setup-school-a',
    'pending_setup',
    'owner.setup@school-app.test',
    'school',
    'Asia/Karachi',
    'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Setup School B',
    'setup-school-b',
    'pending_setup',
    'other.setup@school-app.test',
    'school',
    'Asia/Karachi',
    'en'
  );

insert into public.school_campuses (
  id, school_id, name, status, is_default
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Main campus',
    'active',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Main campus',
    'active',
    true
  );

insert into public.school_memberships (
  school_id, user_id, role, status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner',
    'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'teacher',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'owner',
    'active'
  );

-- Owner can update profile
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select * from public.update_school_profile(
      '11111111-1111-1111-1111-111111111111',
      'Setup School A Renamed',
      'both',
      'contact@setup-a.test',
      '+92-300-0000000',
      '1 School Road',
      'Karachi',
      'Sindh',
      'PK'
    )
  $$,
  'owner can update school profile'
);

select lives_ok(
  $$
    select * from public.update_school_branding(
      '11111111-1111-1111-1111-111111111111',
      'https://setup-a.example',
      'Setup A Brand',
      '#0D9488',
      'https://cdn.example/logo.png'
    )
  $$,
  'owner can update school branding'
);

select lives_ok(
  $$
    select * from public.update_school_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'Asia/Karachi',
      'en',
      array[1,2,3,4,5]::smallint[]
    )
  $$,
  'owner can update locale settings'
);

select lives_ok(
  $$
    select * from public.create_school_holiday(
      '11111111-1111-1111-1111-111111111111',
      'Founders Day',
      '2026-03-23'::date
    )
  $$,
  'owner can create school holiday'
);

select lives_ok(
  $$
    select * from public.update_school_campus(
      '33333333-3333-3333-3333-333333333333',
      'Main campus',
      'MAIN',
      '+92-21-1111111',
      'campus@setup-a.test',
      '1 School Road',
      'Karachi',
      'active'
    )
  $$,
  'owner can update campus'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select * from public.update_school_profile(
      '11111111-1111-1111-1111-111111111111',
      'Hacked Name',
      'school'
    )
  $$,
  '42501',
  'Not authorized to update this school',
  'teacher cannot update school profile'
);

select throws_ok(
  $$
    select * from public.complete_school_setup(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '42501',
  'Not authorized to complete setup for this school',
  'teacher cannot complete school setup'
);

-- Cross-school denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.update_school_profile(
      '11111111-1111-1111-1111-111111111111',
      'Cross Tenant',
      'school'
    )
  $$,
  '42501',
  'Not authorized to update this school',
  'other school owner cannot update school A'
);

-- Direct lifecycle update denied (even as owner via Data API)
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

reset role;
-- Simulate authenticated client attempt via security invoker path:
-- Use a SECURITY INVOKER helper isn't available; instead verify trigger as table owner
-- by attempting update without bypass as the authenticated role after re-granting
-- temporarily would defeat the purpose. Verify via set_config absence + UPDATE as
-- postgres that trigger blocks without bypass, then complete_school_setup works.

select throws_ok(
  $$
    update public.schools
    set status = 'active'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  'schools.status cannot be changed via Data API',
  'direct status update blocked without bypass'
);

select throws_ok(
  $$
    update public.schools
    set setup_completed_at = now()
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '23514',
  'schools.setup_completed_at cannot be changed via Data API',
  'direct setup_completed_at update blocked without bypass'
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
    select * from public.complete_school_setup(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  'owner can complete school setup'
);

select results_eq(
  $$
    select status, setup_completed_at is not null
    from public.schools
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$
    values ('active'::text, true)
  $$,
  'school becomes active with setup_completed_at set'
);

-- Idempotent complete
select lives_ok(
  $$
    select * from public.complete_school_setup(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  'complete_school_setup is idempotent when already active'
);

-- Audit event present
reset role;
select ok(
  exists(
    select 1
    from public.audit_events
    where action = 'school.setup.completed'
      and school_id = '11111111-1111-1111-1111-111111111111'
      and actor_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  'setup completion writes audit event'
);

select ok(
  exists(
    select 1
    from public.audit_events
    where action = 'school.profile_updated'
      and school_id = '11111111-1111-1111-1111-111111111111'
  ),
  'profile update writes audit event'
);

-- Authenticated cannot UPDATE schools directly (grant revoked)
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    update public.schools
    set name = 'Should Fail'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  '42501',
  null,
  'authenticated cannot direct-update schools after grant revoke'
);

select * from finish();

rollback;
