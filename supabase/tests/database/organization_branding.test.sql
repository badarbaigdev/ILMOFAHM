-- ILM-ORG-004: Branding / contact allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

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
    'owner-org004@example.test',
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
    'owner-b-org004@example.test',
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
    'teacher-org004@example.test',
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
    'school-a-org004',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-org004',
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
    select contact_email, brand_primary_color
    from public.update_organization_branding(
      '11111111-1111-1111-1111-111111111111',
      'office@school-a.example.test',
      '+92-21-1111111',
      'https://school-a.example.test',
      'School A Brand',
      '#0F766E',
      'https://cdn.example.test/logo-a.png'
    )
  $$,
  $$
    values ('office@school-a.example.test'::text, '#0F766E'::text)
  $$,
  'owner can update organization branding and contact'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'organization.branding_updated'
  ),
  1,
  'branding update writes audit event'
);

select results_eq(
  $$
    select brand_display_name, brand_primary_color
    from public.update_campus_branding_overrides(
      '33333333-3333-3333-3333-333333333333',
      'Campus A1 Brand',
      '#134E4A',
      null
    )
  $$,
  $$
    values ('Campus A1 Brand'::text, '#134E4A'::text)
  $$,
  'owner can set campus branding overrides'
);

select throws_ok(
  $$
    select * from public.update_organization_branding(
      '11111111-1111-1111-1111-111111111111',
      'bad-email',
      null, null, null, null, null
    )
  $$,
  '22023',
  'Valid contact email is required when provided',
  'invalid contact email is rejected'
);

select throws_ok(
  $$
    select * from public.update_organization_branding(
      '11111111-1111-1111-1111-111111111111',
      null, null, null, null, 'teal', null
    )
  $$,
  '22023',
  'Brand color must be a #RRGGBB hex value',
  'invalid brand color is rejected'
);

-- Teacher denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_branding(
      '11111111-1111-1111-1111-111111111111',
      't@example.test',
      null, null, null, null, null
    )
  $$,
  '42501',
  'Not authorized to update branding for this organization',
  'teacher cannot update organization branding'
);

select throws_ok(
  $$
    select * from public.update_campus_branding_overrides(
      '33333333-3333-3333-3333-333333333333',
      'Hacked',
      null,
      null
    )
  $$,
  '42501',
  'Not authorized to update branding for this organization',
  'teacher cannot update campus branding overrides'
);

-- Cross-tenant denied
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select * from public.update_organization_branding(
      '22222222-2222-2222-2222-222222222222',
      'x@example.test',
      null, null, null, null, null
    )
  $$,
  '42501',
  'Not authorized to update branding for this organization',
  'owner cannot update another organization branding'
);

select throws_ok(
  $$
    select * from public.update_campus_branding_overrides(
      '44444444-4444-4444-4444-444444444444',
      'Stolen',
      null,
      null
    )
  $$,
  '42501',
  'Not authorized to update branding for this organization',
  'owner cannot update campus branding in another organization'
);

reset role;
set local role anon;

select throws_ok(
  $$
    select * from public.update_organization_branding(
      '11111111-1111-1111-1111-111111111111',
      'a@example.test',
      null, null, null, null, null
    )
  $$,
  '42501',
  null,
  'anon cannot update branding'
);

select * from finish();
rollback;
