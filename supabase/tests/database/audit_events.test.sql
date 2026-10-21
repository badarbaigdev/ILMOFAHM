-- ILM-PLAT-008: Audit foundation allow/deny + sanitization tests
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

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
    'owner-audit@example.test',
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
    'teacher-audit@example.test',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner Audit'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Teacher Audit');

insert into public.organizations (id, name, slug, institution_type, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Audit School',
    'audit-school',
    'school',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Other Org',
    'other-org-audit',
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
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'teacher',
    'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner',
    'active'
  );

-- Seed one audit row as bypass role for mutation/isolation checks.
select public.write_audit_event(
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'test.seed',
  'organization',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'email', 'invitee@example.test',
    'password', 'should-never-store',
    'access_token', 'tok_abc',
    'role', 'teacher'
  ),
  'success',
  'owner'
);

-- ---------------------------------------------------------------------------
-- Sanitization
-- ---------------------------------------------------------------------------

select is(
  public.sanitize_audit_metadata(
    '{"email":"invitee@example.test","password":"x","role":"teacher","access_token":"t"}'::jsonb
  ),
  '{"email":"i***@example.test","role":"teacher"}'::jsonb,
  'sanitize strips secrets and redacts email'
);

select results_eq(
  $$ select metadata->'email', metadata ? 'password', metadata ? 'access_token', metadata->>'role'
     from public.audit_events
     where action = 'test.seed' $$,
  $$ values ('"i***@example.test"'::jsonb, false, false, 'teacher') $$,
  'persisted audit metadata is sanitized'
);

-- ---------------------------------------------------------------------------
-- Anonymous / non-manager denied; manager reads own org only
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select id from public.audit_events $$,
  '42501',
  null,
  'anon cannot select audit_events'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$ select id from public.audit_events $$,
  'teacher cannot select audit_events'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);

select results_eq(
  $$ select action from public.audit_events
     where organization_id = '11111111-1111-1111-1111-111111111111'
     order by action $$,
  $$ values ('test.seed') $$,
  'owner can select audit events for own organization'
);

-- ---------------------------------------------------------------------------
-- Append-only + no client insert
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.audit_events (
       organization_id, actor_user_id, action, target_type
     ) values (
       '11111111-1111-1111-1111-111111111111',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'direct.insert',
       'organization'
     ) $$,
  '42501',
  null,
  'authenticated cannot insert audit_events directly'
);

select throws_ok(
  $$ update public.audit_events set action = 'hacked' where action = 'test.seed' $$,
  '42501',
  null,
  'authenticated has no update privilege on audit_events'
);

-- Triggers enforce append-only even for roles that bypass RLS/grants.
reset role;

select throws_ok(
  $$ update public.audit_events set action = 'hacked' where action = 'test.seed' $$,
  '23514',
  null,
  'audit_events trigger rejects updates'
);

select throws_ok(
  $$ delete from public.audit_events where action = 'test.seed' $$,
  '23514',
  null,
  'audit_events trigger rejects deletes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- ---------------------------------------------------------------------------
-- record_audit_event + provisioning audit
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.record_audit_event(
       '11111111-1111-1111-1111-111111111111',
       'membership.note',
       'organization_membership',
       null,
       '{"token":"nope","note":"ok"}'::jsonb,
       'success'
     ) $$,
  'active member can record a sanitized audit event'
);

select results_eq(
  $$ select metadata ? 'token', metadata->>'note', actor_role
     from public.audit_events
     where action = 'membership.note' $$,
  $$ values (false, 'ok', 'owner') $$,
  'record_audit_event strips secrets and stores actor_role'
);

select results_eq(
  $$ select already_provisioned
     from public.create_organization_with_owner(
       'Provisioned Audit Org',
       'school',
       '99999999-9999-9999-9999-999999999901',
       'provisioned-audit-org'
     ) $$,
  $$ values (false) $$,
  'owner can provision an organization'
);

select isnt_empty(
  $$ select id from public.audit_events
     where action = 'organization.provisioned'
       and organization_id = (
         select id from public.organizations where slug = 'provisioned-audit-org'
       ) $$,
  'organization provisioning emits an audit event'
);

select * from finish();
rollback;
