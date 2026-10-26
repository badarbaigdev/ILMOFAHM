-- Synthetic data for Riverbend Coaching (existing provisioned school on develop).
-- Idempotent: looks up school by name. Password for new staff Auth users: DevPass123!
-- Single DO block for `supabase db query -f`.

do $$
declare
  v_school_id uuid;
  v_campus_id uuid;
  v_owner_id uuid;
  v_teacher_user uuid := 'f1111111-1111-4111-8111-111111111111';
  v_accountant_user uuid := 'f2222222-2222-4222-8222-222222222222';
  v_year_id uuid := 'f3333333-3333-4333-8333-333333333331';
  v_term1_id uuid := 'f3333333-3333-4333-8333-333333333332';
  v_term2_id uuid := 'f3333333-3333-4333-8333-333333333333';
  v_g_found uuid := 'f4444444-4444-4444-8444-444444444441';
  v_g_inter uuid := 'f4444444-4444-4444-8444-444444444442';
  v_g_adv uuid := 'f4444444-4444-4444-8444-444444444443';
  v_sec_m uuid := 'f5555555-5555-4555-8555-555555555551';
  v_sec_e uuid := 'f5555555-5555-4555-8555-555555555552';
  v_sec_i uuid := 'f5555555-5555-4555-8555-555555555553';
  v_sec_a uuid := 'f5555555-5555-4555-8555-555555555554';
  v_subj_math uuid := 'f6666666-6666-4666-8666-666666666661';
  v_subj_eng uuid := 'f6666666-6666-4666-8666-666666666662';
  v_subj_phys uuid := 'f6666666-6666-4666-8666-666666666663';
  v_subj_chem uuid := 'f6666666-6666-4666-8666-666666666664';
  v_t1 uuid := 'f7777777-7777-4777-8777-777777777771';
  v_t2 uuid := 'f7777777-7777-4777-8777-777777777772';
  v_t3 uuid := 'f7777777-7777-4777-8777-777777777773';
  v_st1 uuid := 'f8888888-8888-4888-8888-888888888881';
  v_st2 uuid := 'f8888888-8888-4888-8888-888888888882';
  v_st3 uuid := 'f8888888-8888-4888-8888-888888888883';
  v_st4 uuid := 'f8888888-8888-4888-8888-888888888884';
  v_st5 uuid := 'f8888888-8888-4888-8888-888888888885';
  v_st6 uuid := 'f8888888-8888-4888-8888-888888888886';
  v_st7 uuid := 'f8888888-8888-4888-8888-888888888887';
  v_st8 uuid := 'f8888888-8888-4888-8888-888888888888';
  v_g1 uuid := 'f9999999-9999-4999-8999-999999999991';
  v_g2 uuid := 'f9999999-9999-4999-8999-999999999992';
  v_g3 uuid := 'f9999999-9999-4999-8999-999999999993';
  v_g4 uuid := 'f9999999-9999-4999-8999-999999999994';
  v_fh_fee uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
  v_fh_notes uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02';
  v_fh_lab uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03';
  v_ch1 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01';
  v_ch2 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02';
  v_ch3 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03';
  v_ch4 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04';
  v_ch5 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05';
  v_ch6 uuid := 'fbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06';
  v_pay1 uuid := 'fccccccc-cccc-4ccc-8ccc-cccccccccc01';
  v_pay2 uuid := 'fccccccc-cccc-4ccc-8ccc-cccccccccc02';
  v_pay3 uuid := 'fccccccc-cccc-4ccc-8ccc-cccccccccc03';
  v_att1 uuid := 'fddddddd-dddd-4ddd-8ddd-dddddddddd01';
  v_att2 uuid := 'fddddddd-dddd-4ddd-8ddd-dddddddddd02';
  v_password text := extensions.crypt('DevPass123!', extensions.gen_salt('bf'));
  v_today date := current_date;
  v_yesterday date := current_date - 1;
begin
  select s.id into v_school_id
  from public.schools as s
  where s.name = 'Riverbend Coaching'
  order by s.created_at asc
  limit 1;

  if v_school_id is null then
    raise exception 'Riverbend Coaching school not found — approve/provision it first';
  end if;

  -- Enable school academic modules (was academy-only).
  update public.schools
  set institution_type = 'both',
      setup_completed_at = coalesce(setup_completed_at, now()),
      status = case when status in ('pending_setup', 'provisioning') then 'active' else status end
  where id = v_school_id;

  select c.id into v_campus_id
  from public.school_campuses as c
  where c.school_id = v_school_id
  order by c.is_default desc, c.created_at asc
  limit 1;

  if v_campus_id is null then
    v_campus_id := 'feeeeeee-eeee-4eee-8eee-eeeeeeeeee01';
    insert into public.school_campuses (
      id, school_id, name, city, status, is_default
    )
    values (
      v_campus_id, v_school_id, 'Main centre', 'Islamabad', 'active', true
    )
    on conflict (id) do nothing;
  end if;

  select m.user_id into v_owner_id
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.role = 'owner'
    and m.status = 'active'
  limit 1;

  -- Staff Auth users (teacher + accountant) for role testing
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    (
      '00000000-0000-0000-0000-000000000000', v_teacher_user,
      'authenticated', 'authenticated', 'teacher@riverbend-demo.com', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Nadia Rehman"}'::jsonb, now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_accountant_user,
      'authenticated', 'authenticated', 'accountant@riverbend-demo.com', v_password,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kamran Ali"}'::jsonb, now(), now(), '', '', '', ''
    )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values
    (
      v_teacher_user, v_teacher_user,
      jsonb_build_object('sub', v_teacher_user::text, 'email', 'teacher@riverbend-demo.com', 'email_verified', true),
      'email', v_teacher_user::text, now(), now(), now()
    ),
    (
      v_accountant_user, v_accountant_user,
      jsonb_build_object('sub', v_accountant_user::text, 'email', 'accountant@riverbend-demo.com', 'email_verified', true),
      'email', v_accountant_user::text, now(), now(), now()
    )
  on conflict do nothing;

  insert into public.profiles (id, full_name)
  values
    (v_teacher_user, 'Nadia Rehman'),
    (v_accountant_user, 'Kamran Ali')
  on conflict (id) do nothing;

  insert into public.school_memberships (school_id, user_id, role, status)
  values
    (v_school_id, v_teacher_user, 'teacher', 'active'),
    (v_school_id, v_accountant_user, 'accountant', 'active')
  on conflict (school_id, user_id) do update
  set role = excluded.role, status = 'active', updated_at = now();

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
      'Bilal Ahmed', 'bilal.ahmed@riverbend-demo.com'
    );
  end if;

  -- Academic structure (coaching batches as grades/sections)
  insert into public.school_academic_years (
    id, school_id, name, starts_on, ends_on, status, is_current
  )
  values (
    v_year_id, v_school_id, 'Session 2026',
    '2026-01-01', '2026-12-31', 'active', true
  )
  on conflict (id) do nothing;

  insert into public.school_academic_terms (
    id, school_id, academic_year_id, name, starts_on, ends_on, sort_order
  )
  values
    (v_term1_id, v_school_id, v_year_id, 'Spring', '2026-01-01', '2026-06-30', 1),
    (v_term2_id, v_school_id, v_year_id, 'Fall', '2026-07-01', '2026-12-31', 2)
  on conflict (id) do nothing;

  insert into public.school_grades (
    id, school_id, school_campus_id, name, code, sort_order, status
  )
  values
    (v_g_found, v_school_id, v_campus_id, 'Foundation', 'FND', 1, 'active'),
    (v_g_inter, v_school_id, v_campus_id, 'Intermediate', 'INT', 2, 'active'),
    (v_g_adv, v_school_id, v_campus_id, 'Advanced', 'ADV', 3, 'active')
  on conflict (id) do nothing;

  insert into public.school_sections (
    id, school_id, grade_id, school_campus_id, name, capacity, status
  )
  values
    (v_sec_m, v_school_id, v_g_found, v_campus_id, 'Morning', 25, 'active'),
    (v_sec_e, v_school_id, v_g_found, v_campus_id, 'Evening', 25, 'active'),
    (v_sec_i, v_school_id, v_g_inter, v_campus_id, 'Batch A', 30, 'active'),
    (v_sec_a, v_school_id, v_g_adv, v_campus_id, 'Batch A', 20, 'active')
  on conflict (id) do nothing;

  insert into public.school_subjects (
    id, school_id, name, code, status
  )
  values
    (v_subj_math, v_school_id, 'Mathematics', 'MATH', 'active'),
    (v_subj_eng, v_school_id, 'English', 'ENG', 'active'),
    (v_subj_phys, v_school_id, 'Physics', 'PHY', 'active'),
    (v_subj_chem, v_school_id, 'Chemistry', 'CHM', 'active')
  on conflict (id) do nothing;

  insert into public.school_teachers (
    id, school_id, staff_number, first_name, last_name,
    email, phone, primary_subject, status, user_id
  )
  values
    (
      v_t1, v_school_id, 'RB-T01', 'Nadia', 'Rehman',
      'teacher@riverbend-demo.com', '+92 333 2000001', 'Mathematics',
      'active', v_teacher_user
    ),
    (
      v_t2, v_school_id, 'RB-T02', 'Usman', 'Javed',
      'usman.javed@riverbend-demo.com', '+92 333 2000002', 'Physics',
      'active', null
    ),
    (
      v_t3, v_school_id, 'RB-T03', 'Hira', 'Shah',
      'hira.shah@riverbend-demo.com', '+92 333 2000003', 'Chemistry',
      'active', null
    )
  on conflict (id) do nothing;

  insert into public.school_students (
    id, school_id, school_campus_id, student_number,
    first_name, last_name, date_of_birth, gender, status
  )
  values
    (v_st1, v_school_id, v_campus_id, 'RB-101', 'Yusuf', 'Malik', '2008-03-11', 'male', 'active'),
    (v_st2, v_school_id, v_campus_id, 'RB-102', 'Ayesha', 'Rauf', '2008-07-22', 'female', 'active'),
    (v_st3, v_school_id, v_campus_id, 'RB-103', 'Hamza', 'Qureshi', '2007-11-05', 'male', 'active'),
    (v_st4, v_school_id, v_campus_id, 'RB-104', 'Mariam', 'Aziz', '2007-01-19', 'female', 'active'),
    (v_st5, v_school_id, v_campus_id, 'RB-105', 'Daniyal', 'Mir', '2006-09-30', 'male', 'active'),
    (v_st6, v_school_id, v_campus_id, 'RB-106', 'Sana', 'Latif', '2006-04-14', 'female', 'active'),
    (v_st7, v_school_id, v_campus_id, 'RB-107', 'Ibrahim', 'Nawaz', '2005-12-02', 'male', 'active'),
    (v_st8, v_school_id, v_campus_id, 'RB-108', 'Laiba', 'Farooq', '2005-08-27', 'female', 'active')
  on conflict (id) do nothing;

  insert into public.school_enrolments (
    school_id, student_id, academic_year_id, grade_id, section_id,
    status, enrolled_on
  )
  values
    (v_school_id, v_st1, v_year_id, v_g_found, v_sec_m, 'enrolled', '2026-01-10'),
    (v_school_id, v_st2, v_year_id, v_g_found, v_sec_m, 'enrolled', '2026-01-10'),
    (v_school_id, v_st3, v_year_id, v_g_found, v_sec_e, 'enrolled', '2026-01-12'),
    (v_school_id, v_st4, v_year_id, v_g_inter, v_sec_i, 'enrolled', '2026-01-08'),
    (v_school_id, v_st5, v_year_id, v_g_inter, v_sec_i, 'enrolled', '2026-01-08'),
    (v_school_id, v_st6, v_year_id, v_g_inter, v_sec_i, 'enrolled', '2026-01-15'),
    (v_school_id, v_st7, v_year_id, v_g_adv, v_sec_a, 'enrolled', '2026-01-05'),
    (v_school_id, v_st8, v_year_id, v_g_adv, v_sec_a, 'enrolled', '2026-01-05')
  on conflict do nothing;

  insert into public.school_guardians (
    id, school_id, first_name, last_name, email, phone, status
  )
  values
    (v_g1, v_school_id, 'Tariq', 'Malik', 'tariq.malik@riverbend-demo.com', '+92 300 7000001', 'active'),
    (v_g2, v_school_id, 'Farah', 'Rauf', 'farah.rauf@riverbend-demo.com', '+92 300 7000002', 'active'),
    (v_g3, v_school_id, 'Imran', 'Qureshi', 'imran.qureshi@riverbend-demo.com', '+92 300 7000003', 'active'),
    (v_g4, v_school_id, 'Nida', 'Aziz', 'nida.aziz@riverbend-demo.com', '+92 300 7000004', 'active')
  on conflict (id) do nothing;

  insert into public.school_student_guardians (
    school_id, student_id, guardian_id, relationship, is_primary, status
  )
  values
    (v_school_id, v_st1, v_g1, 'father', true, 'active'),
    (v_school_id, v_st2, v_g2, 'mother', true, 'active'),
    (v_school_id, v_st3, v_g3, 'father', true, 'active'),
    (v_school_id, v_st4, v_g4, 'mother', true, 'active'),
    (v_school_id, v_st5, v_g3, 'guardian', false, 'active')
  on conflict (student_id, guardian_id) do nothing;

  insert into public.school_fee_heads (
    id, school_id, code, name, default_amount, status
  )
  values
    (v_fh_fee, v_school_id, 'COURSE', 'Course fee', 12000.00, 'active'),
    (v_fh_notes, v_school_id, 'NOTES', 'Notes / materials', 2500.00, 'active'),
    (v_fh_lab, v_school_id, 'LAB', 'Lab / practical', 1500.00, 'active')
  on conflict (id) do nothing;

  insert into public.school_fee_charges (
    id, school_id, student_id, fee_head_id, amount, amount_paid, due_date, status
  )
  values
    (v_ch1, v_school_id, v_st1, v_fh_fee, 12000.00, 12000.00, v_today - 15, 'paid'),
    (v_ch2, v_school_id, v_st1, v_fh_notes, 2500.00, 0.00, v_today + 7, 'due'),
    (v_ch3, v_school_id, v_st2, v_fh_fee, 12000.00, 6000.00, v_today - 5, 'partial'),
    (v_ch4, v_school_id, v_st4, v_fh_fee, 12000.00, 0.00, v_today - 25, 'due'),
    (v_ch5, v_school_id, v_st7, v_fh_fee, 15000.00, 15000.00, v_today - 10, 'paid'),
    (v_ch6, v_school_id, v_st8, v_fh_lab, 1500.00, 0.00, v_today + 14, 'due')
  on conflict (id) do nothing;

  insert into public.school_fee_payments (
    id, school_id, charge_id, amount, method, paid_on,
    receipt_number, idempotency_key, notes
  )
  values
    (
      v_pay1, v_school_id, v_ch1, 12000.00, 'bank_transfer', v_today - 12,
      'RB-RCPT-2001', 'seed-rb-yusuf-course', 'Full course fee'
    ),
    (
      v_pay2, v_school_id, v_ch3, 6000.00, 'cash', v_today - 4,
      'RB-RCPT-2002', 'seed-rb-ayesha-partial', 'First instalment'
    ),
    (
      v_pay3, v_school_id, v_ch5, 15000.00, 'cheque', v_today - 9,
      'RB-RCPT-2003', 'seed-rb-ibrahim-adv', 'Advanced batch'
    )
  on conflict (id) do nothing;

  insert into public.school_attendance_sessions (
    id, school_id, section_id, attendance_date, status,
    opened_by, submitted_by, submitted_at
  )
  values
    (
      v_att1, v_school_id, v_sec_m, v_yesterday, 'submitted',
      coalesce(v_owner_id, v_teacher_user),
      coalesce(v_owner_id, v_teacher_user),
      (v_yesterday + time '18:00')::timestamptz
    ),
    (
      v_att2, v_school_id, v_sec_m, v_today, 'draft',
      v_teacher_user, null, null
    )
  on conflict (id) do nothing;

  insert into public.school_attendance_marks (
    school_id, session_id, student_id, status, note
  )
  values
    (v_school_id, v_att1, v_st1, 'present', null),
    (v_school_id, v_att1, v_st2, 'present', null),
    (v_school_id, v_att2, v_st1, 'late', 'Traffic'),
    (v_school_id, v_att2, v_st2, 'present', null)
  on conflict (session_id, student_id) do nothing;

  insert into public.school_holidays (school_id, name, holiday_date)
  values
    (v_school_id, 'Eid break (sample)', '2026-03-21'),
    (v_school_id, 'Independence Day', '2026-08-14')
  on conflict (school_id, holiday_date) do nothing;

  raise notice 'Riverbend Coaching fixtures loaded for school %', v_school_id;
  raise notice '  teacher@riverbend-demo.com / DevPass123!';
  raise notice '  accountant@riverbend-demo.com / DevPass123!';
  raise notice '  Owner remains the activated applicant account for this school.';
end;
$$;
