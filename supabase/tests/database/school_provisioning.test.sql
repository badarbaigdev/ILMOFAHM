-- Phase 6: idempotent school provisioning
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
    'authenticated', 'authenticated', 'op-prov@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'member-prov@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Provision Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Regular Member');

insert into public.platform_operators (user_id, role, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'operator',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Incomplete school for heal fixture (no campus / invite yet)
reset role;
insert into public.schools (
  id, name, slug, status, email, institution_type
)
values (
  'dddddddd-4444-4444-4444-444444444444',
  'Prov Heal School',
  'prov-heal-school',
  'provisioning',
  'applicant.heal@school-app.test',
  'school'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.school_applications (
  id,
  school_name,
  applicant_name,
  applicant_email,
  city,
  institution_type,
  status,
  provisioned_school_id,
  provisioned_at
)
values
  (
    'aaaaaaaa-1111-1111-1111-111111111111',
    'Prov Fresh School',
    'Applicant Fresh',
    'applicant.fresh@school-app.test',
    'Lahore',
    'school',
    'pending',
    null,
    null
  ),
  (
    'bbbbbbbb-2222-2222-2222-222222222222',
    'Prov Approved Only',
    'Applicant Approved',
    'applicant.approved@school-app.test',
    'Karachi',
    'academy',
    'approved',
    null,
    null
  ),
  (
    'cccccccc-3333-3333-3333-333333333333',
    'Prov Heal School',
    'Applicant Heal',
    'applicant.heal@school-app.test',
    'Islamabad',
    'school',
    'approved',
    'dddddddd-4444-4444-4444-444444444444',
    now()
  );

-- Non-operator denied
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select * from public.provision_school_from_application(
      'bbbbbbbb-2222-2222-2222-222222222222'
    )
  $$,
  '42501',
  null,
  'non-operator cannot provision'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

-- Pending cannot provision directly
select throws_ok(
  $$
    select * from public.provision_school_from_application(
      'aaaaaaaa-1111-1111-1111-111111111111'
    )
  $$,
  '22023',
  null,
  'pending application cannot be provisioned without approval'
);

-- Approve + provision
select lives_ok(
  $$
    select * from public.approve_school_application(
      'aaaaaaaa-1111-1111-1111-111111111111',
      'ok',
      'North campus'
    )
  $$,
  'approve provisions pending application'
);

select is(
  (
    select count(*)::integer
    from public.schools as s
    where s.name = 'Prov Fresh School'
  ),
  1,
  'exactly one school after approve'
);

-- Double approve is idempotent
select results_eq(
  $$
    select already_provisioned, invitation_token is null
    from public.approve_school_application(
      'aaaaaaaa-1111-1111-1111-111111111111'
    )
  $$,
  $$ values (true, true) $$,
  'second approve does not create another school or token'
);

select is(
  (
    select count(*)::integer
    from public.schools as s
    where s.name = 'Prov Fresh School'
  ),
  1,
  'still exactly one school after retry'
);

-- Approved-without-school recovery via provision RPC
select lives_ok(
  $$
    select * from public.provision_school_from_application(
      'bbbbbbbb-2222-2222-2222-222222222222',
      'Harbour campus'
    )
  $$,
  'approved unprovisioned application can be provisioned'
);

select results_eq(
  $$
    select already_provisioned
    from public.provision_school_from_application(
      'bbbbbbbb-2222-2222-2222-222222222222'
    )
  $$,
  $$ values (true) $$,
  'second provision is idempotent'
);

-- Heal path: incomplete school already linked above
select results_eq(
  $$
    select already_provisioned, healed, invitation_token is not null
    from public.provision_school_from_application(
      'cccccccc-3333-3333-3333-333333333333',
      'Repaired campus'
    )
  $$,
  $$ values (true, true, true) $$,
  'heal creates missing campus and invitation'
);

select results_eq(
  $$
    select s.status, sc.name, si.status
    from public.school_applications as sa
    join public.schools as s on s.id = sa.provisioned_school_id
    join public.school_campuses as sc
      on sc.school_id = s.id and sc.is_default
    join public.school_invitations as si
      on si.school_id = s.id and si.role = 'owner'
    where sa.id = 'cccccccc-3333-3333-3333-333333333333'
  $$,
  $$ values (
    'pending_setup'::text,
    'Repaired campus'::text,
    'pending'::text
  ) $$,
  'healed school reaches pending_setup with campus and invite'
);

reset role;

select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    where ae.action = 'school.provisioned'
      and ae.target_type = 'school'
  $$,
  'provision writes school.provisioned audit'
);

select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    where ae.action = 'school.provisioning.healed'
  $$,
  'heal writes school.provisioning.healed audit'
);

select * from finish();

rollback;
