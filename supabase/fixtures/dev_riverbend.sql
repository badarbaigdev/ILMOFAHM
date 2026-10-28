-- Synthetic demo dataset for Riverbend Coaching (existing provisioned school).
-- Idempotent refresh: looks up school by name, wipes ONLY that school's
-- operational demo tables, then recreates interconnected records.
--
-- Target scale:
--   8 class groups (4 grades × sections A/B), 150 students, 15 teachers,
--   guardians, 2 months of fees + payments, ~2 months attendance, timetables.
--
-- Auth (optional staff for role testing) — password: DevPass123!
--   teacher@riverbend-demo.com
--   accountant@riverbend-demo.com
-- Does not create student/guardian login accounts.
--
-- Apply:
--   ./scripts/seed-dev-fixtures.sh --linked riverbend
--   ./scripts/seed-dev-fixtures.sh riverbend   # local

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

  v_grade_ids uuid[] := array[
    'f4444444-4444-4444-8444-444444444441'::uuid,
    'f4444444-4444-4444-8444-444444444442'::uuid,
    'f4444444-4444-4444-8444-444444444443'::uuid,
    'f4444444-4444-4444-8444-444444444444'::uuid
  ];
  v_grade_names text[] := array['Matric IX', 'Matric X', 'Inter XI', 'Inter XII'];
  v_grade_codes text[] := array['M9', 'M10', 'I11', 'I12'];

  v_section_ids uuid[] := array[
    'f5555555-5555-4555-8555-555555555551'::uuid,
    'f5555555-5555-4555-8555-555555555552'::uuid,
    'f5555555-5555-4555-8555-555555555553'::uuid,
    'f5555555-5555-4555-8555-555555555554'::uuid,
    'f5555555-5555-4555-8555-555555555555'::uuid,
    'f5555555-5555-4555-8555-555555555556'::uuid,
    'f5555555-5555-4555-8555-555555555557'::uuid,
    'f5555555-5555-4555-8555-555555555558'::uuid
  ];

  v_subj_ids uuid[] := array[
    'f6666666-6666-4666-8666-666666666661'::uuid,
    'f6666666-6666-4666-8666-666666666662'::uuid,
    'f6666666-6666-4666-8666-666666666663'::uuid,
    'f6666666-6666-4666-8666-666666666664'::uuid,
    'f6666666-6666-4666-8666-666666666665'::uuid,
    'f6666666-6666-4666-8666-666666666666'::uuid,
    'f6666666-6666-4666-8666-666666666667'::uuid,
    'f6666666-6666-4666-8666-666666666668'::uuid
  ];
  v_subj_names text[] := array[
    'Mathematics', 'English', 'Physics', 'Chemistry',
    'Biology', 'Urdu', 'Computer Science', 'Pakistan Studies'
  ];
  v_subj_codes text[] := array['MATH', 'ENG', 'PHY', 'CHM', 'BIO', 'URD', 'CS', 'PST'];

  v_teacher_ids uuid[] := array[
    'f7777777-7777-4777-8777-777777777701'::uuid,
    'f7777777-7777-4777-8777-777777777702'::uuid,
    'f7777777-7777-4777-8777-777777777703'::uuid,
    'f7777777-7777-4777-8777-777777777704'::uuid,
    'f7777777-7777-4777-8777-777777777705'::uuid,
    'f7777777-7777-4777-8777-777777777706'::uuid,
    'f7777777-7777-4777-8777-777777777707'::uuid,
    'f7777777-7777-4777-8777-777777777708'::uuid,
    'f7777777-7777-4777-8777-777777777709'::uuid,
    'f7777777-7777-4777-8777-777777777710'::uuid,
    'f7777777-7777-4777-8777-777777777711'::uuid,
    'f7777777-7777-4777-8777-777777777712'::uuid,
    'f7777777-7777-4777-8777-777777777713'::uuid,
    'f7777777-7777-4777-8777-777777777714'::uuid,
    'f7777777-7777-4777-8777-777777777715'::uuid
  ];
  v_t_first text[] := array[
    'Nadia', 'Usman', 'Hira', 'Faraz', 'Sana',
    'Bilal', 'Mehwish', 'Omar', 'Ayesha', 'Kamran',
    'Rabia', 'Danish', 'Iqra', 'Saad', 'Zoya'
  ];
  v_t_last text[] := array[
    'Rehman', 'Javed', 'Shah', 'Khan', 'Malik',
    'Ahmed', 'Siddiqui', 'Qureshi', 'Hassan', 'Ali',
    'Noor', 'Raza', 'Bibi', 'Iqbal', 'Farooq'
  ];
  -- Index into v_subj_ids for each teacher's primary subject (1-based).
  v_t_subj int[] := array[1, 3, 4, 1, 2, 5, 6, 7, 2, 8, 3, 4, 5, 7, 6];

  v_room_ids uuid[] := array[
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee01'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee02'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee03'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee04'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee05'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee06'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee07'::uuid,
    'feeeeeee-eeee-4eee-8eee-eeeeeeeeee08'::uuid
  ];

  v_fh_tuition uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01';
  v_fh_notes uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02';
  v_fh_lab uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03';
  v_fh_transport uuid := 'faaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04';

  v_password text := extensions.crypt('DevPass123!', extensions.gen_salt('bf'));

  v_male_first text[] := array[
    'Yusuf', 'Hamza', 'Daniyal', 'Ibrahim', 'Ahmed', 'Ali', 'Omar', 'Hassan',
    'Zain', 'Bilal', 'Saad', 'Usman', 'Rayyan', 'Haris', 'Faizan', 'Taha',
    'Arham', 'Mikail', 'Sameer', 'Rehan', 'Nabeel', 'Shahzaib', 'Ayaan', 'Ibrar'
  ];
  v_female_first text[] := array[
    'Ayesha', 'Mariam', 'Sana', 'Laiba', 'Hira', 'Fatima', 'Noor', 'Zara',
    'Amina', 'Iqra', 'Maham', 'Esha', 'Hania', 'Alina', 'Sara', 'Dua',
    'Rida', 'Mehak', 'Kinza', 'Areeba', 'Hafsa', 'Anaya', 'Wania', 'Eman'
  ];
  v_last_names text[] := array[
    'Malik', 'Rauf', 'Qureshi', 'Aziz', 'Mir', 'Latif', 'Nawaz', 'Farooq',
    'Khan', 'Ahmed', 'Shah', 'Butt', 'Chaudhry', 'Sheikh', 'Raza', 'Iqbal',
    'Hussain', 'Siddiqui', 'Ansari', 'Baig', 'Dar', 'Gillani', 'Hashmi', 'Javed'
  ];
  v_g_first text[] := array[
    'Tariq', 'Farah', 'Imran', 'Nida', 'Asif', 'Samina', 'Javed', 'Rubina',
    'Khalid', 'Shazia', 'Waseem', 'Bushra', 'Nadeem', 'Fouzia', 'Adnan', 'Saima'
  ];
  v_g_last text[] := array[
    'Malik', 'Rauf', 'Qureshi', 'Aziz', 'Mir', 'Latif', 'Nawaz', 'Farooq',
    'Khan', 'Ahmed', 'Shah', 'Butt', 'Chaudhry', 'Sheikh', 'Raza', 'Iqbal'
  ];

  v_period_starts time[] := array[
    time '08:00', time '08:50', time '09:40', time '10:40', time '11:30'
  ];
  v_period_ends time[] := array[
    time '08:45', time '09:35', time '10:25', time '11:25', time '12:15'
  ];

  -- Runtime
  i int;
  g int;
  s int;
  t int;
  p int;
  v_dow int;
  v_student_id uuid;
  v_guardian_id uuid;
  v_section_id uuid;
  v_grade_id uuid;
  v_first text;
  v_last text;
  v_gender text;
  v_dob date;
  v_enrolled date;
  v_rel text;
  v_is_primary boolean;
  v_shared_guardian uuid;
  v_charge_id uuid;
  v_amount numeric(12, 2);
  v_paid numeric(12, 2);
  v_status text;
  v_due date;
  v_month_start date;
  v_month_label text;
  v_bucket int;
  v_day date;
  v_iso int;
  v_session_id uuid;
  v_mark text;
  v_teacher_pick int;
  v_subj_pick int;
  v_used int[];
  v_tuition numeric(12, 2);
  v_student_ids uuid[] := array[]::uuid[];
  v_section_of_student int[] := array[]::int[];
  v_guardian_ids uuid[] := array[]::uuid[];
  v_att_from date;
  v_att_to date;
  v_fee_m1 date;
  v_fee_m2 date;
  v_count_students int := 0;
  v_count_teachers int := 0;
  v_count_guardians int := 0;
  v_count_charges int := 0;
  v_count_payments int := 0;
  v_count_sessions int := 0;
  v_count_marks int := 0;
  v_count_tt int := 0;
begin
  select s.id into v_school_id
  from public.schools as s
  where s.name = 'Riverbend Coaching'
  order by s.created_at asc
  limit 1;

  if v_school_id is null then
    raise exception 'Riverbend Coaching school not found — approve/provision it first';
  end if;

  -- ------------------------------------------------------------------
  -- School profile / branding / calendar
  -- ------------------------------------------------------------------
  update public.schools
  set institution_type = 'both',
      setup_completed_at = coalesce(setup_completed_at, now()),
      status = case
        when status in ('pending_setup', 'provisioning') then 'active'
        else status
      end,
      brand_display_name = 'Riverbend Coaching',
      brand_primary_color = '#0f766e',
      brand_logo_url = 'https://placehold.co/256x256/0f766e/ffffff/png?text=RC',
      email = coalesce(nullif(trim(email), ''), 'office@riverbend-demo.com'),
      phone = coalesce(nullif(trim(phone), ''), '+92 51 111 724 000'),
      city = coalesce(nullif(trim(city), ''), 'Islamabad'),
      timezone = 'Asia/Karachi',
      default_locale = 'en-PK',
      website_url = 'https://riverbend-demo.example',
      working_days = array[1, 2, 3, 4, 5, 6]::smallint[],
      address_line1 = coalesce(nullif(trim(address_line1), ''), '12 Riverbend Road'),
      region = coalesce(nullif(trim(region), ''), 'Islamabad Capital Territory')
  where id = v_school_id;

  select c.id into v_campus_id
  from public.school_campuses as c
  where c.school_id = v_school_id
  order by c.is_default desc, c.created_at asc
  limit 1;

  if v_campus_id is null then
    v_campus_id := 'feeeeeee-eeee-4eee-8eee-eeeeeeeeee00';
    insert into public.school_campuses (
      id, school_id, name, city, status, is_default
    )
    values (
      v_campus_id, v_school_id, 'Main centre', 'Islamabad', 'active', true
    );
  else
    update public.school_campuses
    set name = 'Main centre',
        city = 'Islamabad',
        status = 'active',
        is_default = true
    where id = v_campus_id;
  end if;

  select m.user_id into v_owner_id
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.role = 'owner'
    and m.status = 'active'
  limit 1;

  -- ------------------------------------------------------------------
  -- Wipe prior Riverbend operational demo data (tenant-scoped only)
  -- ------------------------------------------------------------------
  delete from public.school_exam_marks
  where school_id = v_school_id;

  delete from public.school_exam_papers
  where school_id = v_school_id;

  delete from public.school_examinations
  where school_id = v_school_id;

  delete from public.school_grading_bands
  where school_id = v_school_id;

  delete from public.school_grading_scales
  where school_id = v_school_id;

  delete from public.school_attendance_marks
  where school_id = v_school_id;

  delete from public.school_attendance_sessions
  where school_id = v_school_id;

  delete from public.school_fee_payments
  where school_id = v_school_id;

  delete from public.school_fee_charges
  where school_id = v_school_id;

  delete from public.school_fee_heads
  where school_id = v_school_id;

  delete from public.school_timetable_entries
  where school_id = v_school_id;

  delete from public.school_rooms
  where school_id = v_school_id;

  delete from public.school_student_guardians
  where school_id = v_school_id;

  delete from public.school_enrolments
  where school_id = v_school_id;

  update public.school_student_import_rows as r
  set student_id = null
  where r.student_id in (
    select st.id from public.school_students as st where st.school_id = v_school_id
  );

  delete from public.school_guardians
  where school_id = v_school_id;

  delete from public.school_students
  where school_id = v_school_id;

  delete from public.school_teachers
  where school_id = v_school_id;

  delete from public.school_sections
  where school_id = v_school_id;

  delete from public.school_grades
  where school_id = v_school_id;

  delete from public.school_subjects
  where school_id = v_school_id;

  delete from public.school_academic_terms
  where school_id = v_school_id;

  delete from public.school_academic_years
  where school_id = v_school_id;

  delete from public.school_holidays
  where school_id = v_school_id;

  -- ------------------------------------------------------------------
  -- Optional staff Auth users (role testing only)
  -- ------------------------------------------------------------------
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
      jsonb_build_object(
        'sub', v_teacher_user::text,
        'email', 'teacher@riverbend-demo.com',
        'email_verified', true
      ),
      'email', v_teacher_user::text, now(), now(), now()
    ),
    (
      v_accountant_user, v_accountant_user,
      jsonb_build_object(
        'sub', v_accountant_user::text,
        'email', 'accountant@riverbend-demo.com',
        'email_verified', true
      ),
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

  -- ------------------------------------------------------------------
  -- Academic year / terms / grades / sections / subjects
  -- ------------------------------------------------------------------
  insert into public.school_academic_years (
    id, school_id, name, starts_on, ends_on, status, is_current
  )
  values (
    v_year_id, v_school_id, 'Session 2026',
    '2026-01-01', '2026-12-31', 'active', true
  );

  insert into public.school_academic_terms (
    id, school_id, academic_year_id, name, starts_on, ends_on, sort_order
  )
  values
    (v_term1_id, v_school_id, v_year_id, 'Spring', '2026-01-01', '2026-06-30', 1),
    (v_term2_id, v_school_id, v_year_id, 'Fall', '2026-07-01', '2026-12-31', 2);

  for g in 1..4 loop
    insert into public.school_grades (
      id, school_id, school_campus_id, name, code, sort_order, status
    )
    values (
      v_grade_ids[g], v_school_id, v_campus_id,
      v_grade_names[g], v_grade_codes[g], g, 'active'
    );

    -- Two sections per grade → 8 class groups
    insert into public.school_sections (
      id, school_id, grade_id, school_campus_id, name, capacity, status
    )
    values
      (
        v_section_ids[(g - 1) * 2 + 1], v_school_id, v_grade_ids[g],
        v_campus_id, 'A', 25, 'active'
      ),
      (
        v_section_ids[(g - 1) * 2 + 2], v_school_id, v_grade_ids[g],
        v_campus_id, 'B', 25, 'active'
      );
  end loop;

  for i in 1..8 loop
    insert into public.school_subjects (id, school_id, name, code, status)
    values (v_subj_ids[i], v_school_id, v_subj_names[i], v_subj_codes[i], 'active');
  end loop;

  -- ------------------------------------------------------------------
  -- Teachers + rooms
  -- ------------------------------------------------------------------
  for t in 1..15 loop
    insert into public.school_teachers (
      id, school_id, staff_number, first_name, last_name,
      email, phone, primary_subject, status, user_id, photo_url
    )
    values (
      v_teacher_ids[t],
      v_school_id,
      'RB-T' || lpad(t::text, 2, '0'),
      v_t_first[t],
      v_t_last[t],
      lower(v_t_first[t]) || '.' || lower(v_t_last[t]) || '@riverbend-demo.com',
      '+92 333 21' || lpad((10000 + t)::text, 5, '0'),
      v_subj_names[v_t_subj[t]],
      'active',
      case when t = 1 then v_teacher_user else null end,
      null
    );
    v_count_teachers := v_count_teachers + 1;
  end loop;

  -- Keep accountant email unique for the linked membership user.
  update public.school_teachers
  set email = 'teacher@riverbend-demo.com'
  where id = v_teacher_ids[1];

  for i in 1..8 loop
    insert into public.school_rooms (id, school_id, name, status)
    values (
      v_room_ids[i], v_school_id, 'Room ' || i::text, 'active'
    );
  end loop;

  -- ------------------------------------------------------------------
  -- Students, enrolments, guardians (150)
  -- ------------------------------------------------------------------
  for i in 1..150 loop
    s := ((i - 1) % 8) + 1;
    g := ((s - 1) / 2) + 1;
    v_section_id := v_section_ids[s];
    v_grade_id := v_grade_ids[g];

    if i % 2 = 1 then
      v_first := v_male_first[((i - 1) % array_length(v_male_first, 1)) + 1];
      v_gender := 'male';
    else
      v_first := v_female_first[((i - 1) % array_length(v_female_first, 1)) + 1];
      v_gender := 'female';
    end if;
    v_last := v_last_names[((i - 1) % array_length(v_last_names, 1)) + 1];

    -- Age roughly matches grade band
    v_dob := (date '2010-01-01' - ((g - 1) * 365) - ((i % 200)))::date;
    v_enrolled := (date '2026-01-05' + ((i % 20)))::date;

    v_student_id := (
      'f8888888-8888-4888-8888-' || lpad(to_hex(i), 12, '0')
    )::uuid;

    insert into public.school_students (
      id, school_id, school_campus_id, student_number,
      first_name, last_name, date_of_birth, gender, status, photo_url
    )
    values (
      v_student_id, v_school_id, v_campus_id,
      'RB-' || lpad(i::text, 3, '0'),
      v_first, v_last, v_dob, v_gender, 'active', null
    );

    insert into public.school_enrolments (
      school_id, student_id, academic_year_id, grade_id, section_id,
      status, enrolled_on
    )
    values (
      v_school_id, v_student_id, v_year_id, v_grade_id, v_section_id,
      'enrolled', v_enrolled
    );

    v_student_ids := array_append(v_student_ids, v_student_id);
    v_section_of_student := array_append(v_section_of_student, s);
    v_count_students := v_count_students + 1;

    -- Guardians: siblings every 3rd student share previous primary guardian
    if i > 1 and i % 3 = 0 then
      v_guardian_id := v_guardian_ids[i - 1];
      v_rel := 'guardian';
      v_is_primary := true;
    else
      v_guardian_id := (
        'f9999999-9999-4999-8999-' || lpad(to_hex(i), 12, '0')
      )::uuid;
      insert into public.school_guardians (
        id, school_id, first_name, last_name, email, phone, status, photo_url
      )
      values (
        v_guardian_id,
        v_school_id,
        v_g_first[((i - 1) % array_length(v_g_first, 1)) + 1],
        v_last,
        'guardian.' || lpad(i::text, 3, '0') || '@riverbend-demo.com',
        '+92 300 7' || lpad((100000 + i)::text, 6, '0'),
        'active',
        null
      );
      v_count_guardians := v_count_guardians + 1;
      v_rel := case when i % 2 = 1 then 'father' else 'mother' end;
      v_is_primary := true;
    end if;

    v_guardian_ids := array_append(v_guardian_ids, v_guardian_id);

    insert into public.school_student_guardians (
      school_id, student_id, guardian_id, relationship, is_primary, status
    )
    values (
      v_school_id, v_student_id, v_guardian_id, v_rel, v_is_primary, 'active'
    );

    -- Occasional secondary contact
    if i % 7 = 0 then
      v_shared_guardian := (
        'f9999999-9999-4999-8999-' || lpad(to_hex(1000 + i), 12, '0')
      )::uuid;
      insert into public.school_guardians (
        id, school_id, first_name, last_name, email, phone, status
      )
      values (
        v_shared_guardian,
        v_school_id,
        v_g_first[((i + 3) % array_length(v_g_first, 1)) + 1],
        v_last,
        'alt.guardian.' || lpad(i::text, 3, '0') || '@riverbend-demo.com',
        '+92 301 7' || lpad((100000 + i)::text, 6, '0'),
        'active'
      );
      v_count_guardians := v_count_guardians + 1;
      insert into public.school_student_guardians (
        school_id, student_id, guardian_id, relationship, is_primary, status
      )
      values (
        v_school_id, v_student_id, v_shared_guardian, 'other', false, 'active'
      );
    end if;
  end loop;

  -- ------------------------------------------------------------------
  -- Fee heads + two months of charges/payments
  -- ------------------------------------------------------------------
  insert into public.school_fee_heads (
    id, school_id, code, name, default_amount, status
  )
  values
    (v_fh_tuition, v_school_id, 'TUITION', 'Monthly tuition', 12000.00, 'active'),
    (v_fh_notes, v_school_id, 'NOTES', 'Notes / materials', 2500.00, 'active'),
    (v_fh_lab, v_school_id, 'LAB', 'Lab / practical', 1500.00, 'active'),
    (v_fh_transport, v_school_id, 'TRANSPORT', 'Transport', 4000.00, 'active');

  -- Anchor fee months to the two calendar months before the current month.
  v_fee_m1 := date_trunc('month', current_date - interval '2 months')::date;
  v_fee_m2 := date_trunc('month', current_date - interval '1 month')::date;

  for i in 1..150 loop
    v_student_id := v_student_ids[i];
    g := ((v_section_of_student[i] - 1) / 2) + 1;
    v_tuition := case g
      when 1 then 10000.00
      when 2 then 11000.00
      when 3 then 13000.00
      else 15000.00
    end;

    foreach v_month_start in array array[v_fee_m1, v_fee_m2] loop
      v_month_label := to_char(v_month_start, 'YYYY-MM');
      v_bucket := (i + extract(month from v_month_start)::int) % 5;
      -- Mix: paid / partial / overdue unpaid / current due / paid
      if v_bucket = 0 then
        v_paid := v_tuition;
        v_status := 'paid';
        v_due := v_month_start + 10;
      elsif v_bucket = 1 then
        v_paid := round(v_tuition * 0.5, 2);
        v_status := 'partial';
        v_due := v_month_start + 10;
      elsif v_bucket = 2 then
        v_paid := 0;
        v_status := 'due';
        v_due := v_month_start + 5; -- overdue relative to today for past months
      elsif v_bucket = 3 then
        v_paid := 0;
        v_status := 'due';
        v_due := greatest(v_month_start + 25, current_date + 3);
      else
        v_paid := v_tuition;
        v_status := 'paid';
        v_due := v_month_start + 12;
      end if;

      v_charge_id := (
        'fb100000-0000-4000-8000-' ||
        lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
      )::uuid;

      insert into public.school_fee_charges (
        id, school_id, student_id, fee_head_id,
        amount, amount_paid, due_date, status
      )
      values (
        v_charge_id, v_school_id, v_student_id, v_fh_tuition,
        v_tuition, v_paid, v_due, v_status
      );
      v_count_charges := v_count_charges + 1;

      if v_paid > 0 then
        insert into public.school_fee_payments (
          id, school_id, charge_id, amount, method, paid_on,
          receipt_number, idempotency_key, notes
        )
        values (
          (
            'fc100000-0000-4000-8000-' ||
            lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
          )::uuid,
          v_school_id,
          v_charge_id,
          v_paid,
          case (i % 4)
            when 0 then 'cash'
            when 1 then 'bank_transfer'
            when 2 then 'cheque'
            else 'other'
          end,
          least(v_due, current_date) - ((i % 3)),
          'RB-RCPT-' || v_month_label || '-' || lpad(i::text, 3, '0'),
          'seed-rb-tuition-' || v_month_label || '-' || i::text,
          'Demo payment for tuition ' || v_month_label
        );
        v_count_payments := v_count_payments + 1;
      end if;

      -- Additional charges for a subset of students
      if i % 3 = 0 then
        v_amount := 2500.00;
        v_bucket := (i + 1) % 3;
        if v_bucket = 0 then
          v_paid := v_amount; v_status := 'paid';
        elsif v_bucket = 1 then
          v_paid := 1000.00; v_status := 'partial';
        else
          v_paid := 0; v_status := 'due';
        end if;
        v_charge_id := (
          'fb200000-0000-4000-8000-' ||
          lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
        )::uuid;
        insert into public.school_fee_charges (
          id, school_id, student_id, fee_head_id,
          amount, amount_paid, due_date, status
        )
        values (
          v_charge_id, v_school_id, v_student_id, v_fh_notes,
          v_amount, v_paid, v_month_start + 15, v_status
        );
        v_count_charges := v_count_charges + 1;
        if v_paid > 0 then
          insert into public.school_fee_payments (
            id, school_id, charge_id, amount, method, paid_on,
            receipt_number, idempotency_key, notes
          )
          values (
            (
              'fc200000-0000-4000-8000-' ||
              lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
            )::uuid,
            v_school_id, v_charge_id, v_paid, 'cash',
            v_month_start + 14,
            'RB-RCPT-N-' || v_month_label || '-' || lpad(i::text, 3, '0'),
            'seed-rb-notes-' || v_month_label || '-' || i::text,
            null
          );
          v_count_payments := v_count_payments + 1;
        end if;
      end if;

      if i % 5 = 0 then
        v_amount := 1500.00;
        v_paid := case when i % 10 = 0 then v_amount else 0 end;
        v_status := case when v_paid > 0 then 'paid' else 'due' end;
        v_charge_id := (
          'fb300000-0000-4000-8000-' ||
          lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
        )::uuid;
        insert into public.school_fee_charges (
          id, school_id, student_id, fee_head_id,
          amount, amount_paid, due_date, status
        )
        values (
          v_charge_id, v_school_id, v_student_id, v_fh_lab,
          v_amount, v_paid, v_month_start + 18, v_status
        );
        v_count_charges := v_count_charges + 1;
        if v_paid > 0 then
          insert into public.school_fee_payments (
            id, school_id, charge_id, amount, method, paid_on,
            receipt_number, idempotency_key, notes
          )
          values (
            (
              'fc300000-0000-4000-8000-' ||
              lpad(to_hex((i * 10) + extract(month from v_month_start)::int), 12, '0')
            )::uuid,
            v_school_id, v_charge_id, v_paid, 'bank_transfer',
            v_month_start + 16,
            'RB-RCPT-L-' || v_month_label || '-' || lpad(i::text, 3, '0'),
            'seed-rb-lab-' || v_month_label || '-' || i::text,
            null
          );
          v_count_payments := v_count_payments + 1;
        end if;
      end if;

      if i % 4 = 0 and v_month_start = v_fee_m2 then
        v_amount := 4000.00;
        v_paid := case when i % 8 = 0 then v_amount else 0 end;
        v_status := case when v_paid > 0 then 'paid' else 'due' end;
        v_charge_id := (
          'fb400000-0000-4000-8000-' ||
          lpad(to_hex(i), 12, '0')
        )::uuid;
        insert into public.school_fee_charges (
          id, school_id, student_id, fee_head_id,
          amount, amount_paid, due_date, status
        )
        values (
          v_charge_id, v_school_id, v_student_id, v_fh_transport,
          v_amount, v_paid, v_month_start + 20, v_status
        );
        v_count_charges := v_count_charges + 1;
        if v_paid > 0 then
          insert into public.school_fee_payments (
            id, school_id, charge_id, amount, method, paid_on,
            receipt_number, idempotency_key, notes
          )
          values (
            (
              'fc400000-0000-4000-8000-' ||
              lpad(to_hex(i), 12, '0')
            )::uuid,
            v_school_id, v_charge_id, v_paid, 'cash',
            v_month_start + 19,
            'RB-RCPT-T-' || v_month_label || '-' || lpad(i::text, 3, '0'),
            'seed-rb-transport-' || v_month_label || '-' || i::text,
            null
          );
          v_count_payments := v_count_payments + 1;
        end if;
      end if;
    end loop;
  end loop;

  -- ------------------------------------------------------------------
  -- Holidays + ~2 months attendance (school days only)
  -- ------------------------------------------------------------------
  insert into public.school_holidays (school_id, name, holiday_date)
  values
    (v_school_id, 'Eid break (demo)', (current_date - 40)),
    (v_school_id, 'Staff development day', (current_date - 18)),
    (v_school_id, 'Independence Day', '2026-08-14'),
    (v_school_id, 'Quaid-e-Azam Day', '2026-12-25')
  on conflict (school_id, holiday_date) do nothing;

  v_att_from := current_date - 60;
  v_att_to := current_date - 1;

  for v_day in
    select gs::date
    from generate_series(v_att_from, v_att_to, interval '1 day') as gs
  loop
    v_iso := extract(isodow from v_day)::int; -- 1=Mon … 7=Sun
    if v_iso = 7 then
      continue; -- Sunday closed
    end if;
    if exists (
      select 1 from public.school_holidays h
      where h.school_id = v_school_id and h.holiday_date = v_day
    ) then
      continue;
    end if;

    for s in 1..8 loop
      -- Deterministic id from day ordinal + section (avoids collisions across the window).
      v_session_id := (
        'fd000000-0000-4000-8000-' ||
        lpad(to_hex(((v_day - date '2020-01-01') * 10) + s), 12, '0')
      )::uuid;

      insert into public.school_attendance_sessions (
        id, school_id, section_id, attendance_date, status,
        opened_by, submitted_by, submitted_at
      )
      values (
        v_session_id,
        v_school_id,
        v_section_ids[s],
        v_day,
        'submitted',
        coalesce(v_owner_id, v_teacher_user),
        coalesce(v_owner_id, v_teacher_user),
        (v_day + time '17:30')::timestamptz
      );
      v_count_sessions := v_count_sessions + 1;

      for i in 1..150 loop
        if v_section_of_student[i] <> s then
          continue;
        end if;
        -- Deterministic mix: mostly present, some late/absent
        case ((i + extract(doy from v_day)::int) % 17)
          when 0 then v_mark := 'absent';
          when 1 then v_mark := 'late';
          when 2 then v_mark := 'half_day';
          when 3 then v_mark := 'excused';
          else v_mark := 'present';
        end case;

        insert into public.school_attendance_marks (
          school_id, session_id, student_id, status, note
        )
        values (
          v_school_id,
          v_session_id,
          v_student_ids[i],
          v_mark,
          case when v_mark = 'late' then 'Arrived after first period' else null end
        );
        v_count_marks := v_count_marks + 1;
      end loop;
    end loop;
  end loop;

  -- ------------------------------------------------------------------
  -- Weekly timetables (Mon–Sat, 5 periods) without teacher/room clashes
  -- ------------------------------------------------------------------
  for v_dow in 1..6 loop
    for p in 1..5 loop
      v_used := array[]::int[];
      for s in 1..8 loop
        -- Pick a teacher whose subject slot fits and who is free this period
        v_teacher_pick := null;
        for t in 1..15 loop
          if not (t = any (v_used)) then
            -- Prefer teachers whose subject cycles with section/day/period
            if ((t + s + v_dow + p) % 3) = 0 or v_teacher_pick is null then
              v_teacher_pick := t;
              if ((t + s + v_dow + p) % 3) = 0 then
                exit;
              end if;
            end if;
          end if;
        end loop;

        if v_teacher_pick is null then
          raise exception
            'Could not assign teacher for day % period % section %',
            v_dow, p, s;
        end if;

        v_used := array_append(v_used, v_teacher_pick);
        v_subj_pick := v_t_subj[v_teacher_pick];

        insert into public.school_timetable_entries (
          school_id, section_id, subject_id, teacher_id, room_id,
          day_of_week, starts_at, ends_at, notes, status
        )
        values (
          v_school_id,
          v_section_ids[s],
          v_subj_ids[v_subj_pick],
          v_teacher_ids[v_teacher_pick],
          v_room_ids[s],
          v_dow,
          v_period_starts[p],
          v_period_ends[p],
          null,
          'active'
        );
        v_count_tt := v_count_tt + 1;
      end loop;
    end loop;
  end loop;

  raise notice 'Riverbend Coaching demo loaded for school %', v_school_id;
  raise notice '  students=% teachers=% guardians=%',
    v_count_students, v_count_teachers, v_count_guardians;
  raise notice '  fee_charges=% fee_payments=%', v_count_charges, v_count_payments;
  raise notice '  attendance_sessions=% marks=% timetable_entries=%',
    v_count_sessions, v_count_marks, v_count_tt;
  raise notice '  teacher@riverbend-demo.com / DevPass123!';
  raise notice '  accountant@riverbend-demo.com / DevPass123!';
end;
$$;
