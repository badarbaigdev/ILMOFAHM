-- Phase 4: public school application insert + audit
-- Run: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

reset role;

-- Anon can insert pending application; audit row is written
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  $$
    insert into public.school_applications (
      school_name,
      applicant_name,
      applicant_email,
      city,
      institution_type,
      message,
      status,
      reviewer_user_id
    ) values (
      'Phase Four School',
      'Applicant Four',
      'applicant.four@school-app.test',
      'Multan',
      'school',
      'Please review when ready.',
      'approved',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'anon insert with privileged fields is accepted after trigger strip'
);

reset role;

select results_eq(
  $$
    select status, reviewer_user_id is null, provisioned_school_id is null
    from public.school_applications
    where applicant_email = 'applicant.four@school-app.test'
  $$,
  $$ values ('pending'::text, true, true) $$,
  'stored application is pending without reviewer or school link'
);

select isnt_empty(
  $$
    select ae.id
    from public.audit_events as ae
    join public.school_applications as sa
      on sa.id = ae.target_id
    where ae.action = 'school.application.submitted'
      and sa.applicant_email = 'applicant.four@school-app.test'
      and ae.metadata ? 'institution_type'
      and not (ae.metadata ? 'applicant_email')
  $$,
  'pending insert writes sanitized application audit event'
);

-- Duplicate open application denied
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select throws_ok(
  $$
    insert into public.school_applications (
      school_name, applicant_name, applicant_email, city, institution_type
    ) values (
      'Phase Four School',
      'Applicant Four',
      'applicant.four@school-app.test',
      'Multan',
      'school'
    )
  $$,
  '23505',
  null,
  'duplicate open application for same email + school is rejected'
);

select throws_ok(
  $$
    select id from public.school_applications
    where applicant_email = 'applicant.four@school-app.test'
  $$,
  '42501',
  null,
  'anon cannot read submitted applications'
);

select * from finish();

rollback;
