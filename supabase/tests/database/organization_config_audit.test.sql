-- ILM-ORG-005: Config audit before/after structure
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

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
    'owner-org005@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner A');

insert into public.organizations (id, name, slug, institution_type, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'School A',
  'school-a-org005',
  'school',
  'active'
);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
)
values (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'owner',
  'active'
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
    select * from public.update_organization_profile(
      '11111111-1111-1111-1111-111111111111',
      'School A Config',
      'both'
    )
  $$,
  'owner updates profile for config audit check'
);

select ok(
  (
    select metadata ? 'before' and metadata ? 'after'
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'organization.profile_updated'
    order by created_at desc
    limit 1
  ),
  'config audit metadata includes before and after'
);

select is(
  (
    select actor_role
    from public.audit_events
    where organization_id = '11111111-1111-1111-1111-111111111111'
      and action = 'organization.profile_updated'
    order by created_at desc
    limit 1
  ),
  'owner',
  'config audit records editor role snapshot'
);

select * from finish();
rollback;
