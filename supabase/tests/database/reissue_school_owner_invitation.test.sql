-- Reissue school owner activation link (platform operator only)
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

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
    'authenticated', 'authenticated', 'operator.reissue@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'outsider.reissue@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Outsider');

insert into public.platform_operators (user_id, role, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'operator', 'active');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Reissue School',
  'reissue-school',
  'pending_setup',
  'owner.reissue@school-app.test',
  'school',
  'Asia/Karachi',
  'en'
);

insert into public.school_applications (
  id, school_name, applicant_name, applicant_email, city, institution_type,
  status, provisioned_school_id
)
values (
  '55555555-5555-5555-5555-555555555555',
  'Reissue School',
  'Owner',
  'owner.reissue@school-app.test',
  'Karachi',
  'school',
  'approved',
  '11111111-1111-1111-1111-111111111111'
);

insert into public.school_invitations (
  id, school_id, email, role, token_hash, status, invited_by, expires_at
)
values (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'owner.reissue@school-app.test',
  'owner',
  encode(digest('old-token-value-32chars-xxxxxxxxxxxx', 'sha256'), 'hex'),
  'pending',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  now() + interval '7 days'
);

-- Non-operator denied
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select * from public.reissue_school_owner_invitation(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  '42501',
  'Not authorized to reissue school invitations',
  'non-operator cannot reissue owner invite'
);

-- Operator can reissue
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select * from public.reissue_school_owner_invitation(
      '11111111-1111-1111-1111-111111111111'
    )
  $$,
  'operator can reissue owner invitation'
);

select results_eq(
  $$
    select status::text from public.school_invitations
    where id = '66666666-6666-6666-6666-666666666666'
  $$,
  $$ values ('revoked'::text) $$,
  'previous pending owner invite is revoked'
);

select results_eq(
  $$
    select count(*)::integer from public.school_invitations
    where school_id = '11111111-1111-1111-1111-111111111111'
      and role = 'owner'
      and status = 'pending'
  $$,
  $$ values (1) $$,
  'exactly one pending owner invite after reissue'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'school.owner_invitation.reissued'
      and school_id = '11111111-1111-1111-1111-111111111111'
  ),
  'reissue is audited'
);

select * from finish();
rollback;
