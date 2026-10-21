-- ILM-ORG-003: Locale / calendar settings allow/deny tests
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
    'owner-org003@example.test',
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
    'owner-b-org003@example.test',
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
    'teacher-org003@example.test',
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
    'school-a-org003',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-org003',
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

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select timezone, locale, working_days
    from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'Asia/Dubai',
      'ur',
      array[1, 2, 3, 4, 5, 6]::smallint[]
    )
  $$,
  $$
    values (
      'Asia/Dubai'::text,
      'ur'::text,
      array[1, 2, 3, 4, 5, 6]::smallint[]
    )
  $$,
  'owner can update timezone, locale, and working days'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'organization.locale_settings_updated'
  ),
  1,
  'locale settings update writes audit event'
);

select results_eq(
  $$
    select name, holiday_date
    from public.create_organization_holiday(
      '11111111-1111-1111-1111-111111111111',
      'Independence Day',
      '2026-08-14'::date
    )
  $$,
  $$
    values ('Independence Day'::text, '2026-08-14'::date)
  $$,
  'owner can create a holiday'
);

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'Mars/Phobos',
      'en',
      array[1, 2, 3, 4, 5]::smallint[]
    )
  $$,
  '22023',
  'Invalid or unsupported timezone',
  'unsupported timezone is rejected'
);

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'Asia/Karachi',
      'fr',
      array[1, 2, 3, 4, 5]::smallint[]
    )
  $$,
  '22023',
  'Invalid or unsupported locale',
  'unsupported locale is rejected'
);

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'Asia/Karachi',
      'en',
      array[]::smallint[]
    )
  $$,
  '22023',
  'At least one working day is required',
  'empty working days are rejected'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'UTC',
      'en',
      array[1, 2, 3, 4, 5]::smallint[]
    )
  $$,
  '42501',
  'Not authorized to update locale settings for this organization',
  'teacher cannot update locale settings'
);

select throws_ok(
  $$
    select * from public.create_organization_holiday(
      '11111111-1111-1111-1111-111111111111',
      'Teacher Day',
      '2026-10-05'::date
    )
  $$,
  '42501',
  'Not authorized to manage holidays for this organization',
  'teacher cannot create holidays'
);

-- Cross-tenant denied
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '22222222-2222-2222-2222-222222222222',
      'UTC',
      'en',
      array[1, 2, 3, 4, 5]::smallint[]
    )
  $$,
  '42501',
  'Not authorized to update locale settings for this organization',
  'owner cannot update another organization locale settings'
);

select throws_ok(
  $$
    select * from public.create_organization_holiday(
      '22222222-2222-2222-2222-222222222222',
      'Stolen',
      '2026-01-01'::date
    )
  $$,
  '42501',
  'Not authorized to manage holidays for this organization',
  'owner cannot create holiday in another organization'
);

-- Delete own holiday
select lives_ok(
  $$
    select public.delete_organization_holiday(
      (
        select id
        from public.organization_holidays
        where organization_id = '11111111-1111-1111-1111-111111111111'
        limit 1
      )
    )
  $$,
  'owner can delete own holiday'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select * from public.update_organization_locale_settings(
      '11111111-1111-1111-1111-111111111111',
      'UTC',
      'en',
      array[1, 2, 3, 4, 5]::smallint[]
    )
  $$,
  '42501',
  null,
  'anon cannot update locale settings'
);

select * from finish();
rollback;
