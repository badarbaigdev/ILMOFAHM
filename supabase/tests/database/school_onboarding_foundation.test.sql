-- Phase 2: School onboarding foundation RLS allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

reset role;

-- ---------------------------------------------------------------------------
-- Synthetic auth users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'operator@school-onboard.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'owner-a@school-onboard.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'owner-b@school-onboard.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated', 'authenticated', 'outsider@school-onboard.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Platform Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner A'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Owner B'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Outsider');

insert into public.platform_operators (user_id, role, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'operator',
  'active'
);

-- Seed schools / memberships / campuses as bypass role
insert into public.schools (
  id, name, slug, status, institution_type, email
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'School Alpha',
    'school-alpha-onboard',
    'active',
    'school',
    'alpha@school-onboard.test'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'School Beta',
    'school-beta-onboard',
    'active',
    'school',
    'beta@school-onboard.test'
  );

insert into public.school_campuses (
  id, school_id, name, is_default, status
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Main Campus',
    true,
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Main Campus',
    true,
    'active'
  );

insert into public.school_memberships (
  school_id, user_id, role, status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'owner',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'owner',
    'active'
  );

insert into public.school_applications (
  id,
  school_name,
  applicant_name,
  applicant_email,
  city,
  institution_type,
  status,
  reviewer_user_id
)
values (
  '55555555-5555-5555-5555-555555555555',
  'Pending Review School',
  'Applicant One',
  'applicant@school-onboard.test',
  'Lahore',
  'school',
  'under_review',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

-- ---------------------------------------------------------------------------
-- Anon: can submit pending application; cannot read applications or schools
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select lives_ok(
  $$
    insert into public.school_applications (
      school_name, applicant_name, applicant_email, city, institution_type
    ) values (
      'Anon Submitted School',
      'Anon Applicant',
      'anon.applicant@school-onboard.test',
      'Karachi',
      'school'
    )
  $$,
  'anon can insert a pending school application'
);

select throws_ok(
  $$
    select id from public.school_applications
    where applicant_email = 'anon.applicant@school-onboard.test'
  $$,
  '42501',
  null,
  'anon cannot select school_applications (including own insert)'
);

select lives_ok(
  $$
    insert into public.school_applications (
      school_name, applicant_name, applicant_email, status, reviewer_user_id
    ) values (
      'Evil School',
      'Evil',
      'evil@school-onboard.test',
      'approved',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'anon insert with privileged fields is accepted only after trigger strip'
);

select throws_ok(
  $$ select id from public.schools $$,
  '42501',
  null,
  'anon cannot list schools'
);

reset role;

select results_eq(
  $$
    select status, reviewer_user_id is null
    from public.school_applications
    where applicant_email = 'evil@school-onboard.test'
  $$,
  $$ values ('pending'::text, true) $$,
  'anon privileged-field insert is stored as pending without reviewer'
);

-- ---------------------------------------------------------------------------
-- Outsider authenticated: no school access; cannot read applications
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.schools $$,
  'outsider cannot select schools'
);

select is_empty(
  $$
    select id from public.school_applications
    where id = '55555555-5555-5555-5555-555555555555'
  $$,
  'outsider cannot read school applications'
);

select results_eq(
  $$
    update public.school_applications
    set status = 'approved'
    where id = '55555555-5555-5555-5555-555555555555'
    returning id
  $$,
  $$ select id from public.school_applications where false $$,
  'outsider cannot approve school applications'
);

select throws_ok(
  $$
    insert into public.platform_operators (user_id, role, status)
    values (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'operator',
      'active'
    )
  $$,
  '42501',
  null,
  'school outsider cannot self-promote to platform operator'
);

-- ---------------------------------------------------------------------------
-- Owner A: same-school allow, cross-school deny
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select results_eq(
  $$
    select name from public.schools
    order by name
  $$,
  $$ values ('School Alpha') $$,
  'owner A can select only their school'
);

select results_eq(
  $$
    select name from public.school_campuses
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('Main Campus') $$,
  'owner A can select own school campus'
);

select is_empty(
  $$
    select id from public.school_campuses
    where school_id = '22222222-2222-2222-2222-222222222222'
  $$,
  'owner A cannot select School Beta campuses'
);

select throws_ok(
  $$
    update public.school_campuses
    set school_id = '22222222-2222-2222-2222-222222222222'
    where id = '33333333-3333-3333-3333-333333333333'
  $$,
  '23514',
  null,
  'owner A cannot reassign campus school_id'
);

select lives_ok(
  $$
    update public.schools
    set city = 'Lahore'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  'owner A can update own school profile fields'
);

select results_eq(
  $$
    update public.schools
    set city = 'Hacked'
    where id = '22222222-2222-2222-2222-222222222222'
    returning city
  $$,
  $$ select city from public.schools where false $$,
  'owner A cannot update School Beta'
);

select is_empty(
  $$ select id from public.school_applications $$,
  'school owner cannot list platform applications'
);

-- ---------------------------------------------------------------------------
-- Platform operator: applications + all schools
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select isnt_empty(
  $$
    select id from public.school_applications
    where id = '55555555-5555-5555-5555-555555555555'
  $$,
  'operator can read school applications'
);

select lives_ok(
  $$
    update public.school_applications
    set status = 'under_review',
        review_notes = 'Checking documents',
        reviewer_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        reviewed_at = now()
    where id = '55555555-5555-5555-5555-555555555555'
  $$,
  'operator can update application review fields'
);

select results_eq(
  $$
    select count(*)::int from public.schools
  $$,
  $$ values (2) $$,
  'operator can list all schools'
);

select lives_ok(
  $$
    insert into public.school_invitations (
      school_id, email, role, token_hash, expires_at, invited_by
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'new.owner@school-onboard.test',
      'owner',
      encode(sha256(convert_to('test-invite-token-alpha', 'UTF8')), 'hex'),
      now() + interval '7 days',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'operator can create a school invitation with hashed token'
);

-- ---------------------------------------------------------------------------
-- Owner A: invitations for own school; cannot see Beta invites
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select isnt_empty(
  $$
    select id from public.school_invitations
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'owner A can select invitations for own school'
);

reset role;

insert into public.school_invitations (
  school_id, email, role, token_hash, expires_at, invited_by
)
values (
  '22222222-2222-2222-2222-222222222222',
  'beta.invite@school-onboard.test',
  'admin',
  encode(sha256(convert_to('test-invite-token-beta', 'UTF8')), 'hex'),
  now() + interval '7 days',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select is_empty(
  $$
    select id from public.school_invitations
    where school_id = '22222222-2222-2222-2222-222222222222'
  $$,
  'owner A cannot select School Beta invitations'
);

-- ---------------------------------------------------------------------------
-- Trigger: authenticated non-operator insert strips privileged columns
-- ---------------------------------------------------------------------------

select lives_ok(
  $$
    insert into public.school_applications (
      school_name,
      applicant_name,
      applicant_email,
      city,
      institution_type,
      status,
      review_notes
    ) values (
      'Stripped Privilege School',
      'Member Applicant',
      'member.applicant@school-onboard.test',
      'Islamabad',
      'academy',
      'approved',
      'should be cleared'
    )
  $$,
  'authenticated non-operator insert is accepted after privilege strip'
);

reset role;

select results_eq(
  $$
    select status, review_notes is null
    from public.school_applications
    where applicant_email = 'member.applicant@school-onboard.test'
  $$,
  $$ values ('pending'::text, true) $$,
  'non-operator application is stored as pending with notes cleared'
);

-- ---------------------------------------------------------------------------
-- Duplicate open application guard
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$
    insert into public.school_applications (
      school_name, applicant_name, applicant_email, city, institution_type
    ) values (
      'Anon Submitted School',
      'Anon Applicant',
      'anon.applicant@school-onboard.test',
      'Karachi',
      'school'
    )
  $$,
  '23505',
  null,
  'duplicate open application for same email + school name is rejected'
);

select * from finish();

rollback;
