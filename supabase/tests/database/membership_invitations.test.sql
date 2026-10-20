-- ILM-PLAT-006: Invitation + membership status allow/deny tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

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
    'owner-a@example.test',
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
    'owner-b@example.test',
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
    'teacher@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated',
    'authenticated',
    'invitee@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'authenticated',
    'authenticated',
    'expired@example.test',
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
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher C'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Invitee D'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Expired E');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'School A',
    'school-a-invite',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Academy B',
    'academy-b-invite',
    'academy',
    'active'
  );

insert into public.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status
)
values
  (
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner',
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'owner',
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555503',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'teacher',
    'active'
  );

-- ---------------------------------------------------------------------------
-- Anon denied
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.create_organization_invitation(
       '11111111-1111-1111-1111-111111111111',
       'invitee@example.test',
       'teacher'
     ) $$,
  '42501',
  null,
  'anon cannot create invitations'
);

-- ---------------------------------------------------------------------------
-- Non-manager / cross-tenant create denied
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ select * from public.create_organization_invitation(
       '11111111-1111-1111-1111-111111111111',
       'invitee@example.test',
       'staff'
     ) $$,
  '42501',
  null,
  'teacher cannot create invitations'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

select throws_ok(
  $$ select * from public.create_organization_invitation(
       '11111111-1111-1111-1111-111111111111',
       'invitee@example.test',
       'staff'
     ) $$,
  '42501',
  null,
  'owner B cannot invite into organization A'
);

-- ---------------------------------------------------------------------------
-- Owner A creates invitations
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

create temporary table inv_invitee as
select token, invitation_id, expires_at
from public.create_organization_invitation(
  '11111111-1111-1111-1111-111111111111',
  'invitee@example.test',
  'teacher',
  48
);

create temporary table inv_expired as
select token, invitation_id
from public.create_organization_invitation(
  '11111111-1111-1111-1111-111111111111',
  'expired@example.test',
  'staff',
  1
);

select ok(
  (select length(token) >= 64 from inv_invitee),
  'invitation returns a sufficiently long plaintext token'
);

select isnt_empty(
  $$ select id from public.audit_events
     where action = 'membership.invitation_created'
       and organization_id = '11111111-1111-1111-1111-111111111111' $$,
  'creating an invitation writes an audit event'
);

-- ---------------------------------------------------------------------------
-- Accept: email mismatch denied; matching invitee attached only to org A
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

select throws_ok(
  $$ select * from public.accept_organization_invitation(
       (select token from inv_invitee)
     ) $$,
  '42501',
  null,
  'wrong signed-in email cannot accept invitation'
);

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);

select results_eq(
  $$ select out_organization_id, out_role
     from public.accept_organization_invitation(
       (select token from inv_invitee)
     ) $$,
  $$ values (
       '11111111-1111-1111-1111-111111111111'::uuid,
       'teacher'
     ) $$,
  'invitee accepts and joins only organization A'
);

select throws_ok(
  $$ select * from public.accept_organization_invitation(
       (select token from inv_invitee)
     ) $$,
  '22023',
  null,
  'invitation token is single-use'
);

select is_empty(
  $$ select id from public.organization_memberships
     where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
       and organization_id = '22222222-2222-2222-2222-222222222222' $$,
  'accept does not attach invitee to organization B'
);

-- Audit rows are manager-readable only.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select isnt_empty(
  $$ select id from public.audit_events
     where action = 'membership.invitation_accepted'
       and organization_id = '11111111-1111-1111-1111-111111111111' $$,
  'accept writes an audit event'
);

-- ---------------------------------------------------------------------------
-- Expired invitation rejected
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

update public.organization_invitations
set expires_at = now() - interval '1 minute'
where id = (select invitation_id from inv_expired);

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);

select throws_ok(
  $$ select * from public.accept_organization_invitation(
       (select token from inv_expired)
     ) $$,
  '22023',
  null,
  'expired invitation is rejected'
);

-- ---------------------------------------------------------------------------
-- Suspend membership → access denied; last owner protected
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select lives_ok(
  $$ select public.set_membership_status(
       '55555555-5555-5555-5555-555555555503',
       'suspended'
     ) $$,
  'owner can suspend a teacher membership'
);

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);

select is_empty(
  $$ select id from public.organizations
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'suspended member loses organization visibility'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select isnt_empty(
  $$ select id from public.audit_events
     where action = 'membership.status_changed'
       and target_id = '55555555-5555-5555-5555-555555555503' $$,
  'status change writes an audit event'
);

select throws_ok(
  $$ select public.set_membership_status(
       '55555555-5555-5555-5555-555555555501',
       'revoked'
     ) $$,
  '22023',
  null,
  'cannot revoke the last active owner'
);

select * from finish();
rollback;
