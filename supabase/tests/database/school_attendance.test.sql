-- Phase 11: school daily attendance sessions + marks
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
    'authenticated', 'authenticated', 'owner.att@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated', 'authenticated', 'teacher.att@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'authenticated', 'authenticated', 'other.att@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'authenticated', 'authenticated', 'staff.att@school-app.test',
    crypt('test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

insert into public.profiles (id, full_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Teacher'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Other'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Staff');

insert into public.schools (
  id, name, slug, status, email, institution_type, timezone, default_locale
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Att School A', 'att-school-a', 'active',
    'owner.att@school-app.test', 'school', 'Asia/Karachi', 'en'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Att School B', 'att-school-b', 'active',
    'other.att@school-app.test', 'school', 'Asia/Karachi', 'en'
  );

insert into public.school_memberships (school_id, user_id, role, status)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'teacher', 'active'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'staff', 'active'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'owner', 'active'
  );

-- Seed academic + student structure with known IDs (bypass RLS)
insert into public.school_academic_years (
  id, school_id, name, starts_on, ends_on, status, is_current
)
values (
  'aaaaaaaa-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '2026-27', '2026-04-01', '2027-03-31', 'active', true
);

insert into public.school_grades (
  id, school_id, name, code, sort_order, status
)
values (
  'bbbbbbbb-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'Grade 1', 'G1', 1, 'active'
);

insert into public.school_sections (
  id, school_id, grade_id, name, status
)
values (
  'cccccccc-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-1111-4111-8111-111111111111',
  'A', 'active'
);

insert into public.school_students (
  id, school_id, student_number, first_name, last_name, status
)
values (
  'dddddddd-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'ATT-001', 'Ali', 'Khan', 'active'
);

insert into public.school_enrolments (
  id, school_id, student_id, academic_year_id, grade_id, section_id, status
)
values (
  'eeeeeeee-1111-4111-8111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'dddddddd-1111-4111-8111-111111111111',
  'aaaaaaaa-1111-4111-8111-111111111111',
  'bbbbbbbb-1111-4111-8111-111111111111',
  'cccccccc-1111-4111-8111-111111111111',
  'enrolled'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select public.open_school_attendance_session(
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-1111-4111-8111-111111111111',
      '2026-10-22'
    )
  $$,
  'teacher can open attendance session'
);

select results_eq(
  $$
    select mark_count::integer from public.open_school_attendance_session(
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-1111-4111-8111-111111111111',
      '2026-10-22'
    )
  $$,
  $$ values (1) $$,
  're-open is idempotent and keeps roster'
);

select lives_ok(
  $$
    select public.save_school_attendance_marks(
      (select id from public.school_attendance_sessions
       where section_id = 'cccccccc-1111-4111-8111-111111111111'
         and attendance_date = '2026-10-22'),
      jsonb_build_array(
        jsonb_build_object(
          'student_id', 'dddddddd-1111-4111-8111-111111111111',
          'status', 'absent',
          'note', 'Sick'
        )
      )
    )
  $$,
  'teacher can save draft marks'
);

select lives_ok(
  $$
    select public.submit_school_attendance_session(
      (select id from public.school_attendance_sessions
       where section_id = 'cccccccc-1111-4111-8111-111111111111'
         and attendance_date = '2026-10-22')
    )
  $$,
  'teacher can submit attendance'
);

select throws_ok(
  $$
    select public.save_school_attendance_marks(
      (select id from public.school_attendance_sessions
       where section_id = 'cccccccc-1111-4111-8111-111111111111'
         and attendance_date = '2026-10-22'),
      jsonb_build_array(
        jsonb_build_object(
          'student_id', 'dddddddd-1111-4111-8111-111111111111',
          'status', 'present'
        )
      )
    )
  $$,
  '22023',
  'Submitted attendance cannot be bulk-edited; use correction',
  'cannot bulk-edit after submit'
);

select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  true
);

select throws_ok(
  $$
    select public.open_school_attendance_session(
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-1111-4111-8111-111111111111',
      '2026-10-23'
    )
  $$,
  '42501',
  'Not authorized to record attendance',
  'staff cannot open attendance'
);

select results_eq(
  $$
    select count(*)::integer from public.school_attendance_sessions
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (1) $$,
  'staff can select attendance sessions'
);

select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  true
);

select is_empty(
  $$
    select id from public.school_attendance_sessions
    where school_id = '11111111-1111-1111-1111-111111111111'
  $$,
  'cross-tenant cannot select attendance'
);

select throws_ok(
  $$
    select public.open_school_attendance_session(
      '11111111-1111-1111-1111-111111111111',
      'cccccccc-1111-4111-8111-111111111111',
      '2026-10-24'
    )
  $$,
  '42501',
  'Not authorized to record attendance',
  'cross-tenant cannot open attendance'
);

select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.correct_school_attendance_mark(
      (select id from public.school_attendance_marks
       where student_id = 'dddddddd-1111-4111-8111-111111111111'
       limit 1),
      'present',
      'Teacher mistake'
    )
  $$,
  '42501',
  'Not authorized to correct attendance',
  'teacher cannot correct submitted mark'
);

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.correct_school_attendance_mark(
      (select id from public.school_attendance_marks
       where student_id = 'dddddddd-1111-4111-8111-111111111111'
       limit 1),
      'present',
      'Verified late arrival was present'
    )
  $$,
  'owner can correct submitted mark'
);

select results_eq(
  $$
    select status from public.school_attendance_marks
    where student_id = 'dddddddd-1111-4111-8111-111111111111'
  $$,
  $$ values ('present') $$,
  'correction updates mark status'
);

select * from finish();
rollback;
