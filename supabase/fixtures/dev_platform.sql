-- Synthetic develop/local fixtures only.
-- Never use these emails/passwords in production.
-- Password for all Auth users: DevPass123!
--
-- Creates:
--   Platform operator + pending school applications
--   Northvale Academy with full school test data:
--     staff memberships, academic year/terms, grades/sections/subjects,
--     teachers HR, students + enrolments, guardians, fees, attendance
--
-- Single DO block so `supabase db query -f` can run it.

do $$
declare
  -- Auth / people
  v_operator_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_owner_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_teacher_user uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_accountant_user uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  -- School
  v_school_id uuid := '11111111-1111-4111-8111-111111111111';
  v_campus_id uuid := '22222222-2222-4222-8222-222222222222';
  v_app_pending_1 uuid := '33333333-3333-4333-8333-333333333331';
  v_app_pending_2 uuid := '33333333-3333-4333-8333-333333333332';
  -- Academic
  v_year_id uuid := '44444444-4444-4444-8444-444444444441';
  v_term1_id uuid := '44444444-4444-4444-8444-444444444442';
  v_term2_id uuid := '44444444-4444-4444-8444-444444444443';
  v_grade1_id uuid := '55555555-5555-4555-8555-555555555551';
  v_grade2_id uuid := '55555555-5555-4555-8555-555555555552';
  v_grade3_id uuid := '55555555-5555-4555-8555-555555555553';
  v_sec1a_id uuid := '66666666-6666-4666-8666-666666666661';
  v_sec1b_id uuid := '66666666-6666-4666-8666-666666666662';
  v_sec2a_id uuid := '66666666-6666-4666-8666-666666666663';
  v_sec3a_id uuid := '66666666-6666-4666-8666-666666666664';
  v_subj_math uuid := '77777777-7777-4777-8777-777777777771';
  v_subj_eng uuid := '77777777-7777-4777-8777-777777777772';
  v_subj_sci uuid := '77777777-7777-4777-8777-777777777773';
  v_subj_urdu uuid := '77777777-7777-4777-8777-777777777774';
  -- Teachers HR
  v_t_sara uuid := '88888888-8888-4888-8888-888888888881';
  v_t_ahmed uuid := '88888888-8888-4888-8888-888888888882';
  v_t_fatima uuid := '88888888-8888-4888-8888-888888888883';
  -- Students
  v_st_noor uuid := '99999999-9999-4999-8999-999999999991';
  v_st_ali uuid := '99999999-9999-4999-8999-999999999992';
  v_st_zara uuid := '99999999-9999-4999-8999-999999999993';
  v_st_omar uuid := '99999999-9999-4999-8999-999999999994';
  v_st_hana uuid := '99999999-9999-4999-8999-999999999995';
  v_st_bilal uuid := '99999999-9999-4999-8999-999999999996';
  -- Guardians
  v_g_amina uuid := 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaa01';
  v_g_hassan uuid := 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaa02';
  v_g_sana uuid := 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaa03';
  -- Fees
  v_fh_tuition uuid := 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbb01';
  v_fh_transport uuid := 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbb02';
  v_fh_lab uuid := 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbb03';
  v_ch_noor_t uuid := 'cccc3333-cccc-4ccc-8ccc-cccccccccc01';
  v_ch_noor_tr uuid := 'cccc3333-cccc-4ccc-8ccc-cccccccccc02';
  v_ch_ali_t uuid := 'cccc3333-cccc-4ccc-8ccc-cccccccccc03';
  v_ch_zara_t uuid := 'cccc3333-cccc-4ccc-8ccc-cccccccccc04';
  v_ch_omar_t uuid := 'cccc3333-cccc-4ccc-8ccc-cccccccccc05';
  v_pay1 uuid := 'dddd4444-dddd-4ddd-8ddd-dddddddddd01';
  v_pay2 uuid := 'dddd4444-dddd-4ddd-8ddd-dddddddddd02';
  -- Attendance
  v_att_submitted uuid := 'eeee5555-eeee-4eee-8eee-eeeeeeeeee01';
  v_att_draft uuid := 'eeee5555-eeee-4eee-8eee-eeeeeeeeee02';
  v_password text := extensions.crypt('DevPass123!', extensions.gen_salt('bf'));
  v_today date := current_date;
  v_yesterday date := current_date - 1;
begin
  -- ------------------------------------------------------------------
  -- Auth users + identities
  -- ------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    (
      '00000000-0000-0000-0000-000000000000', v_operator_id,
      'authenticated', 'authenticated', 'operator@ilmofahm.test', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dev Operator"}'::jsonb, now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_owner_id,
      'authenticated', 'authenticated', 'owner@northvale.test', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Northvale Owner"}'::jsonb, now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_teacher_user,
      'authenticated', 'authenticated', 'teacher@northvale.test', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sara Malik"}'::jsonb, now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_accountant_user,
      'authenticated', 'authenticated', 'accountant@northvale.test', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Imran Qureshi"}'::jsonb, now(), now(), '', '', '', ''
    )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values
    (
      v_operator_id, v_operator_id,
      jsonb_build_object('sub', v_operator_id::text, 'email', 'operator@ilmofahm.test', 'email_verified', true),
      'email', v_operator_id::text, now(), now(), now()
    ),
    (
      v_owner_id, v_owner_id,
      jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@northvale.test', 'email_verified', true),
      'email', v_owner_id::text, now(), now(), now()
    ),
    (
      v_teacher_user, v_teacher_user,
      jsonb_build_object('sub', v_teacher_user::text, 'email', 'teacher@northvale.test', 'email_verified', true),
      'email', v_teacher_user::text, now(), now(), now()
    ),
    (
      v_accountant_user, v_accountant_user,
      jsonb_build_object('sub', v_accountant_user::text, 'email', 'accountant@northvale.test', 'email_verified', true),
      'email', v_accountant_user::text, now(), now(), now()
    )
  on conflict do nothing;

  insert into public.profiles (id, full_name)
  values
    (v_operator_id, 'Dev Operator'),
    (v_owner_id, 'Northvale Owner'),
    (v_teacher_user, 'Sara Malik'),
    (v_accountant_user, 'Imran Qureshi')
  on conflict (id) do nothing;

  insert into public.platform_operators (user_id, role, status)
  values (v_operator_id, 'operator', 'active')
  on conflict (user_id) do update
  set status = 'active', role = 'operator', updated_at = now();

  -- ------------------------------------------------------------------
  -- School + campus + memberships
  -- ------------------------------------------------------------------
  insert into public.schools (
    id, name, slug, status, email, phone, city, country_code,
    institution_type, timezone, default_locale, setup_completed_at
  )
  values (
    v_school_id, 'Northvale Academy', 'northvale', 'active',
    'owner@northvale.test', '+92 300 0000000', 'Lahore', 'PK',
    'school', 'Asia/Karachi', 'en', now()
  )
  on conflict (id) do nothing;

  insert into public.school_campuses (
    id, school_id, name, city, status, is_default
  )
  values (v_campus_id, v_school_id, 'Main campus', 'Lahore', 'active', true)
  on conflict (id) do nothing;

  insert into public.school_memberships (school_id, user_id, role, status)
  values
    (v_school_id, v_owner_id, 'owner', 'active'),
    (v_school_id, v_teacher_user, 'teacher', 'active'),
    (v_school_id, v_accountant_user, 'accountant', 'active')
  on conflict (school_id, user_id) do update
  set role = excluded.role,
      status = 'active',
      updated_at = now();

  if exists (select 1 from public.subscription_plans where id = 'starter')
     and not exists (
       select 1 from public.school_subscriptions
       where school_id = v_school_id and is_current
     )
  then
    insert into public.school_subscriptions (
      school_id, plan_id, status, billing_interval, starts_at, trial_ends_at,
      is_current, billing_contact_name, billing_contact_email
    )
    values (
      v_school_id, 'starter', 'trial', 'monthly', now(),
      now() + interval '14 days', true,
      'Northvale Owner', 'owner@northvale.test'
    );
  end if;

  insert into public.school_applications (
    id, school_name, applicant_name, applicant_email, phone, city,
    country_code, institution_type, message, status
  )
  values
    (
      -- Use Auth-acceptable domains (not example.com / .test — hosted GoTrue rejects those).
      v_app_pending_1, 'Greenfield Primary', 'Ayesha Khan',
      'ayesha.khan@greenfield-demo.com', '+92 301 1111111', 'Karachi',
      'PK', 'school', 'Looking for attendance and fee modules.', 'pending'
    ),
    (
      v_app_pending_2, 'Riverbend Coaching', 'Bilal Ahmed',
      'bilal.ahmed@riverbend-demo.com', '+92 302 2222222', 'Islamabad',
      'PK', 'academy', 'Need batches and fee instalments.', 'pending'
    )
  on conflict (id) do nothing;

  -- ------------------------------------------------------------------
  -- Academic structure
  -- ------------------------------------------------------------------
  insert into public.school_academic_years (
    id, school_id, name, starts_on, ends_on, status, is_current
  )
  values (
    v_year_id, v_school_id, '2026-27',
    '2026-04-01', '2027-03-31', 'active', true
  )
  on conflict (id) do nothing;

  insert into public.school_academic_terms (
    id, school_id, academic_year_id, name, starts_on, ends_on, sort_order
  )
  values
    (v_term1_id, v_school_id, v_year_id, 'Term 1', '2026-04-01', '2026-09-30', 1),
    (v_term2_id, v_school_id, v_year_id, 'Term 2', '2026-10-01', '2027-03-31', 2)
  on conflict (id) do nothing;

  insert into public.school_grades (
    id, school_id, school_campus_id, name, code, sort_order, status
  )
  values
    (v_grade1_id, v_school_id, v_campus_id, 'Grade 1', 'G1', 1, 'active'),
    (v_grade2_id, v_school_id, v_campus_id, 'Grade 2', 'G2', 2, 'active'),
    (v_grade3_id, v_school_id, v_campus_id, 'Grade 3', 'G3', 3, 'active')
  on conflict (id) do nothing;

  insert into public.school_sections (
    id, school_id, grade_id, school_campus_id, name, capacity, status
  )
  values
    (v_sec1a_id, v_school_id, v_grade1_id, v_campus_id, 'A', 30, 'active'),
    (v_sec1b_id, v_school_id, v_grade1_id, v_campus_id, 'B', 30, 'active'),
    (v_sec2a_id, v_school_id, v_grade2_id, v_campus_id, 'A', 32, 'active'),
    (v_sec3a_id, v_school_id, v_grade3_id, v_campus_id, 'A', 28, 'active')
  on conflict (id) do nothing;

  insert into public.school_subjects (
    id, school_id, name, code, status
  )
  values
    (v_subj_math, v_school_id, 'Mathematics', 'MATH', 'active'),
    (v_subj_eng, v_school_id, 'English', 'ENG', 'active'),
    (v_subj_sci, v_school_id, 'Science', 'SCI', 'active'),
    (v_subj_urdu, v_school_id, 'Urdu', 'URDU', 'active')
  on conflict (id) do nothing;

  -- ------------------------------------------------------------------
  -- Teachers HR (Sara linked to login membership)
  -- ------------------------------------------------------------------
  insert into public.school_teachers (
    id, school_id, staff_number, first_name, last_name,
    email, phone, primary_subject, status, user_id
  )
  values
    (
      v_t_sara, v_school_id, 'T-001', 'Sara', 'Malik',
      'teacher@northvale.test', '+92 300 1111001', 'Mathematics',
      'active', v_teacher_user
    ),
    (
      v_t_ahmed, v_school_id, 'T-002', 'Ahmed', 'Raza',
      'ahmed.raza@northvale.test', '+92 300 1111002', 'Science',
      'active', null
    ),
    (
      v_t_fatima, v_school_id, 'T-003', 'Fatima', 'Noor',
      'fatima.noor@northvale.test', '+92 300 1111003', 'English',
      'active', null
    )
  on conflict (id) do nothing;

  -- ------------------------------------------------------------------
  -- Students + enrolments
  -- ------------------------------------------------------------------
  insert into public.school_students (
    id, school_id, school_campus_id, student_number,
    first_name, last_name, date_of_birth, gender, status
  )
  values
    (v_st_noor, v_school_id, v_campus_id, 'NV-001', 'Noor', 'Ahmed', '2018-05-12', 'female', 'active'),
    (v_st_ali, v_school_id, v_campus_id, 'NV-002', 'Ali', 'Khan', '2018-08-03', 'male', 'active'),
    (v_st_zara, v_school_id, v_campus_id, 'NV-003', 'Zara', 'Hussain', '2017-11-21', 'female', 'active'),
    (v_st_omar, v_school_id, v_campus_id, 'NV-004', 'Omar', 'Sheikh', '2017-02-14', 'male', 'active'),
    (v_st_hana, v_school_id, v_campus_id, 'NV-005', 'Hana', 'Iqbal', '2016-09-09', 'female', 'active'),
    (v_st_bilal, v_school_id, v_campus_id, 'NV-006', 'Bilal', 'Siddiqui', '2016-01-30', 'male', 'active')
  on conflict (id) do nothing;

  insert into public.school_enrolments (
    school_id, student_id, academic_year_id, grade_id, section_id,
    status, enrolled_on
  )
  values
    (v_school_id, v_st_noor, v_year_id, v_grade1_id, v_sec1a_id, 'enrolled', '2026-04-05'),
    (v_school_id, v_st_ali, v_year_id, v_grade1_id, v_sec1a_id, 'enrolled', '2026-04-05'),
    (v_school_id, v_st_zara, v_year_id, v_grade1_id, v_sec1b_id, 'enrolled', '2026-04-06'),
    (v_school_id, v_st_omar, v_year_id, v_grade2_id, v_sec2a_id, 'enrolled', '2026-04-05'),
    (v_school_id, v_st_hana, v_year_id, v_grade3_id, v_sec3a_id, 'enrolled', '2026-04-07'),
    (v_school_id, v_st_bilal, v_year_id, v_grade3_id, v_sec3a_id, 'enrolled', '2026-04-07')
  on conflict do nothing;

  -- ------------------------------------------------------------------
  -- Guardians + links
  -- ------------------------------------------------------------------
  insert into public.school_guardians (
    id, school_id, first_name, last_name, email, phone, status
  )
  values
    (v_g_amina, v_school_id, 'Amina', 'Ahmed', 'amina.ahmed@northvale-demo.com', '+92 321 1000001', 'active'),
    (v_g_hassan, v_school_id, 'Hassan', 'Khan', 'hassan.khan@northvale-demo.com', '+92 321 1000002', 'active'),
    (v_g_sana, v_school_id, 'Sana', 'Hussain', 'sana.hussain@northvale-demo.com', '+92 321 1000003', 'active')
  on conflict (id) do nothing;

  insert into public.school_student_guardians (
    school_id, student_id, guardian_id, relationship, is_primary, status
  )
  values
    (v_school_id, v_st_noor, v_g_amina, 'mother', true, 'active'),
    (v_school_id, v_st_ali, v_g_hassan, 'father', true, 'active'),
    (v_school_id, v_st_zara, v_g_sana, 'mother', true, 'active'),
    (v_school_id, v_st_omar, v_g_hassan, 'guardian', false, 'active')
  on conflict (student_id, guardian_id) do nothing;

  -- ------------------------------------------------------------------
  -- Fees: heads, charges, payments
  -- ------------------------------------------------------------------
  insert into public.school_fee_heads (
    id, school_id, code, name, default_amount, status
  )
  values
    (v_fh_tuition, v_school_id, 'TUITION', 'Monthly tuition', 5000.00, 'active'),
    (v_fh_transport, v_school_id, 'TRANSPORT', 'Transport', 1500.00, 'active'),
    (v_fh_lab, v_school_id, 'LAB', 'Lab fee', 800.00, 'active')
  on conflict (id) do nothing;

  insert into public.school_fee_charges (
    id, school_id, student_id, fee_head_id, amount, amount_paid, due_date, status
  )
  values
    -- Noor: paid tuition + due transport
    (v_ch_noor_t, v_school_id, v_st_noor, v_fh_tuition, 5000.00, 5000.00, v_today - 10, 'paid'),
    (v_ch_noor_tr, v_school_id, v_st_noor, v_fh_transport, 1500.00, 0.00, v_today + 5, 'due'),
    -- Ali: partial tuition
    (v_ch_ali_t, v_school_id, v_st_ali, v_fh_tuition, 5000.00, 2000.00, v_today - 3, 'partial'),
    -- Zara: overdue tuition
    (v_ch_zara_t, v_school_id, v_st_zara, v_fh_tuition, 5000.00, 0.00, v_today - 20, 'due'),
    -- Omar: due tuition
    (v_ch_omar_t, v_school_id, v_st_omar, v_fh_tuition, 5000.00, 0.00, v_today + 12, 'due')
  on conflict (id) do nothing;

  insert into public.school_fee_payments (
    id, school_id, charge_id, amount, method, paid_on,
    receipt_number, idempotency_key, notes
  )
  values
    (
      v_pay1, v_school_id, v_ch_noor_t, 5000.00, 'cash', v_today - 8,
      'NV-RCPT-1001', 'seed-noor-tuition', 'October tuition'
    ),
    (
      v_pay2, v_school_id, v_ch_ali_t, 2000.00, 'bank_transfer', v_today - 2,
      'NV-RCPT-1002', 'seed-ali-partial', 'Partial payment'
    )
  on conflict (id) do nothing;

  -- ------------------------------------------------------------------
  -- Attendance: submitted yesterday (Grade 1-A) + draft today
  -- ------------------------------------------------------------------
  insert into public.school_attendance_sessions (
    id, school_id, section_id, attendance_date, status,
    opened_by, submitted_by, submitted_at
  )
  values
    (
      v_att_submitted, v_school_id, v_sec1a_id, v_yesterday, 'submitted',
      v_teacher_user, v_teacher_user, (v_yesterday + time '15:00')::timestamptz
    ),
    (
      v_att_draft, v_school_id, v_sec1a_id, v_today, 'draft',
      v_teacher_user, null, null
    )
  on conflict (id) do nothing;

  insert into public.school_attendance_marks (
    school_id, session_id, student_id, status, note
  )
  values
    (v_school_id, v_att_submitted, v_st_noor, 'present', null),
    (v_school_id, v_att_submitted, v_st_ali, 'late', 'Arrived 20 min late'),
    (v_school_id, v_att_draft, v_st_noor, 'present', null),
    (v_school_id, v_att_draft, v_st_ali, 'absent', null)
  on conflict (session_id, student_id) do nothing;

  -- Holidays (setup calendar)
  insert into public.school_holidays (school_id, name, holiday_date)
  values
    (v_school_id, 'Pakistan Day', '2026-03-23'),
    (v_school_id, 'Independence Day', '2026-08-14')
  on conflict (school_id, holiday_date) do nothing;

  raise notice 'Dev fixtures ready (full school data).';
  raise notice '  operator@ilmofahm.test / DevPass123!     → /platform';
  raise notice '  owner@northvale.test / DevPass123!       → /school (full data)';
  raise notice '  teacher@northvale.test / DevPass123!     → attendance';
  raise notice '  accountant@northvale.test / DevPass123!  → fees';
end;
$$;
