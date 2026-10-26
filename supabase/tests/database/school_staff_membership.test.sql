-- Phase 10: school staff invitations + membership status
begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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
    'authenticated', 'authenticated', 'owner.staff@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.staff@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.staff@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Teacher A'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Owner B');

insert into public.schools (id, name, slug, status, institution_type)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Staff School A',
    'staff-school-a',
    'active',
    'school'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Staff School B',
    'staff-school-b',
    'active',
    'school'
  );

insert into public.school_memberships (id, school_id, user_id, role, status)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'teacher',
    'active'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'owner',
    'active'
  );

-- Teacher cannot invite
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select * from public.create_school_invitation(
      '11111111-1111-1111-1111-111111111111',
      'new.teacher@school-app.test',
      'teacher'
    )
  $$,
  '42501',
  'Not authorized to invite to this school',
  'teacher cannot create school invitation'
);

-- Cross-school invite denied
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select throws_ok(
  $$
    select * from public.create_school_invitation(
      '11111111-1111-1111-1111-111111111111',
      'cross@school-app.test',
      'staff'
    )
  $$,
  '42501',
  'Not authorized to invite to this school',
  'other school owner cannot invite to school A'
);

-- Owner can invite
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select * from public.create_school_invitation(
      '11111111-1111-1111-1111-111111111111',
      'new.admin@school-app.test',
      'admin'
    )
  $$,
  'owner can create school invitation'
);

-- Owner role rejected
select throws_ok(
  $$
    select * from public.create_school_invitation(
      '11111111-1111-1111-1111-111111111111',
      'new.owner@school-app.test',
      'owner'
    )
  $$,
  '22023',
  'Invalid invitation role',
  'cannot invite with owner role'
);

-- Duplicate pending email
select throws_ok(
  $$
    select * from public.create_school_invitation(
      '11111111-1111-1111-1111-111111111111',
      'new.admin@school-app.test',
      'teacher'
    )
  $$,
  '23505',
  null,
  'duplicate pending invite email denied'
);

-- Revoke pending invite
select lives_ok(
  $$
    select public.revoke_school_invitation(
      (select id from public.school_invitations
       where school_id = '11111111-1111-1111-1111-111111111111'
         and email = 'new.admin@school-app.test'
         and status = 'pending'
       limit 1)
    )
  $$,
  'owner can revoke pending invitation'
);

-- Self suspend denied
select throws_ok(
  $$
    select public.set_school_membership_status(
      '33333333-3333-3333-3333-333333333333',
      'suspended'
    )
  $$,
  '22023',
  'Managers cannot suspend or revoke their own membership',
  'owner cannot suspend self'
);

-- Suspend teacher OK
select lives_ok(
  $$
    select public.set_school_membership_status(
      '44444444-4444-4444-4444-444444444444',
      'suspended'
    )
  $$,
  'owner can suspend teacher'
);

select results_eq(
  $$
    select status from public.school_memberships
    where id = '44444444-4444-4444-4444-444444444444'
  $$,
  $$ values ('suspended'::text) $$,
  'teacher membership is suspended'
);

-- Suspended teacher is not active member
select is(
  public.is_active_school_member('11111111-1111-1111-1111-111111111111'),
  true,
  'owner still counts as active member'
);

-- Role change OK
select lives_ok(
  $$
    select public.set_school_membership_status(
      '44444444-4444-4444-4444-444444444444',
      'active'
    )
  $$,
  'owner can reactivate teacher'
);

select lives_ok(
  $$
    select public.set_school_membership_role(
      '44444444-4444-4444-4444-444444444444',
      'accountant'
    )
  $$,
  'owner can change teacher to accountant'
);

reset role;
select ok(
  exists(
    select 1 from public.audit_events
    where action = 'school.invitation.created'
      and school_id = '11111111-1111-1111-1111-111111111111'
  ),
  'invitation create writes audit'
);

select * from finish();
rollback;
