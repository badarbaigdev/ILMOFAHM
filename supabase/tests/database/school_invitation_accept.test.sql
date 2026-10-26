-- Phase 7: accept school invitation → membership
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

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
    'authenticated', 'authenticated', 'owner.accept@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'wrong.accept@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'op.accept@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'School Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Wrong Email User'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Operator');

insert into public.platform_operators (user_id, role, status)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'operator',
  'active'
);

insert into public.schools (
  id, name, slug, status, email, institution_type
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Accept Invite School',
  'accept-invite-school',
  'pending_setup',
  'owner.accept@school-app.test',
  'school'
);

insert into public.school_invitations (
  id,
  school_id,
  email,
  role,
  token_hash,
  status,
  invited_by,
  expires_at
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'owner.accept@school-app.test',
    'owner',
    encode(digest('valid-school-invite-token-32chars-aa', 'sha256'), 'hex'),
    'pending',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    now() + interval '7 days'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'other.accept@school-app.test',
    'admin',
    encode(digest('expired-school-invite-token-32ch-bb', 'sha256'), 'hex'),
    'pending',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    now() + interval '7 days'
  );

-- Force wall-clock expiry while keeping expires_at > created_at
update public.school_invitations
set
  created_at = now() - interval '10 days',
  expires_at = now() - interval '1 day'
where id = '33333333-3333-3333-3333-333333333333';

-- Wrong email denied
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select * from public.accept_school_invitation(
      'valid-school-invite-token-32chars-aa'
    )
  $$,
  '42501',
  null,
  'wrong email cannot accept school invitation'
);

-- Invalid token
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select throws_ok(
  $$
    select * from public.accept_school_invitation(
      'totally-wrong-token-value-32charsxxx'
    )
  $$,
  'P0002',
  null,
  'invalid token is rejected'
);

-- Expired token
select throws_ok(
  $$
    select * from public.accept_school_invitation(
      'expired-school-invite-token-32ch-bb'
    )
  $$,
  '22023',
  null,
  'expired invitation is rejected'
);

-- Successful accept
select lives_ok(
  $$
    select * from public.accept_school_invitation(
      'valid-school-invite-token-32chars-aa'
    )
  $$,
  'matching email can accept school invitation'
);

select results_eq(
  $$
    select role, status
    from public.school_memberships
    where school_id = '11111111-1111-1111-1111-111111111111'
      and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  $$ values ('owner'::text, 'active'::text) $$,
  'accept creates active owner membership for invitation school only'
);

select results_eq(
  $$
    select status, accepted_by
    from public.school_invitations
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  $$ values (
    'accepted'::text,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ) $$,
  'invitation marked accepted'
);

-- Replay denied
select throws_ok(
  $$
    select * from public.accept_school_invitation(
      'valid-school-invite-token-32chars-aa'
    )
  $$,
  '22023',
  null,
  'accepted invitation cannot be reused'
);

-- Cross-school: membership only for invited school
select is(
  (
    select count(*)::integer
    from public.school_memberships
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  1,
  'acceptor has exactly one school membership'
);

-- Unauthenticated denied
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$
    select * from public.accept_school_invitation(
      'valid-school-invite-token-32chars-aa'
    )
  $$,
  '42501',
  null,
  'anon cannot accept school invitation'
);

reset role;

select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    where ae.action = 'school.invitation.accepted'
      and ae.school_id = '11111111-1111-1111-1111-111111111111'
      and not (ae.metadata ? 'email')
  $$,
  'accept writes school.invitation.accepted audit without email'
);

-- Member can read own school after accept
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select name from public.schools
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values ('Accept Invite School'::text) $$,
  'active member can select their school'
);

select * from finish();

rollback;
