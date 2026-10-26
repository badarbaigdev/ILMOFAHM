-- Phase 5: school application review / approve RPCs
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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
    'authenticated', 'authenticated', 'op-review@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'member-review@example.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Review Operator'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Regular Member');

insert into public.platform_operators (user_id, role, status)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'operator',
  'active'
);

-- Insert fixtures as operator so privileged status values are preserved
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
  status
)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Review Transit School',
    'Applicant Review',
    'applicant.review@school-app.test',
    'Lahore',
    'school',
    'pending'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Approve Path School',
    'Applicant Approve',
    'applicant.approve@school-app.test',
    'Karachi',
    'academy',
    'pending'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Deny Path School',
    'Applicant Deny',
    'applicant.deny@school-app.test',
    'Islamabad',
    'school',
    'approved'
  );

reset role;

-- Transition helper
select is(
  public.school_application_transition_allowed('pending', 'under_review'),
  true,
  'pending → under_review allowed'
);

select is(
  public.school_application_transition_allowed('approved', 'rejected'),
  false,
  'approved → rejected denied'
);

-- Non-operator cannot review
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$
    select public.review_school_application(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'under_review',
      'nope'
    )
  $$,
  '42501',
  null,
  'non-operator cannot review applications'
);

select throws_ok(
  $$
    select * from public.approve_school_application(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )
  $$,
  '42501',
  null,
  'non-operator cannot approve applications'
);

-- Direct update revoked for authenticated
select throws_ok(
  $$
    update public.school_applications
    set status = 'under_review'
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  $$,
  '42501',
  null,
  'authenticated cannot update school_applications directly'
);

-- Operator review transitions
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.review_school_application(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'under_review',
      'Looking into this'
    )
  $$,
  'operator can move pending → under_review'
);

select results_eq(
  $$
    select status, reviewer_user_id
    from public.school_applications
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  $$,
  $$ values (
    'under_review'::text,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
  ) $$,
  'under_review persists reviewer'
);

select throws_ok(
  $$
    select public.review_school_application(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'rejected',
      null,
      null
    )
  $$,
  '22023',
  null,
  'rejection without reason is rejected'
);

select lives_ok(
  $$
    select public.review_school_application(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'information_requested',
      null,
      null,
      'Please confirm campus address'
    )
  $$,
  'operator can request information'
);

select throws_ok(
  $$
    select public.review_school_application(
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'approved'
    )
  $$,
  '22023',
  null,
  'review RPC refuses approval status'
);

-- Approval provisions school + campus + invitation
select lives_ok(
  $$
    select * from public.approve_school_application(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'Looks good',
      'Central campus'
    )
  $$,
  'operator can approve pending application'
);

select results_eq(
  $$
    select
      sa.status,
      sa.provisioned_school_id is not null,
      s.status,
      sc.name,
      si.role,
      si.status
    from public.school_applications as sa
    join public.schools as s on s.id = sa.provisioned_school_id
    join public.school_campuses as sc
      on sc.school_id = s.id and sc.is_default
    join public.school_invitations as si
      on si.school_id = s.id and si.role = 'owner'
    where sa.id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  $$,
  $$ values (
    'approved'::text,
    true,
    'pending_setup'::text,
    'Central campus'::text,
    'owner'::text,
    'pending'::text
  ) $$,
  'approval provisions school, campus, and owner invitation'
);

-- Idempotent second approve
select results_eq(
  $$
    select already_provisioned, invitation_token is null
    from public.approve_school_application(
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    )
  $$,
  $$ values (true, true) $$,
  'second approve is idempotent and does not re-issue token'
);

select is(
  (
    select count(*)::integer
    from public.schools as s
    where s.name = 'Approve Path School'
  ),
  1,
  'approval creates at most one school for the application'
);

-- Approved without school: approve/provision recovers (Phase 6 path)
select lives_ok(
  $$
    select * from public.approve_school_application(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'
    )
  $$,
  'approve of already-approved without school provisions once'
);

reset role;

-- Audit events (operators typically cannot SELECT audit_events via RLS)
select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    where ae.action = 'school.application.reviewed'
      and ae.target_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
  $$,
  'review writes audit event'
);

select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    where ae.action = 'school.application.approved'
      and ae.target_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  $$,
  'approve writes school.application.approved audit'
);

select * from finish();

rollback;
