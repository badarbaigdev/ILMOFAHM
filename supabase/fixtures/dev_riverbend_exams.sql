-- Synthetic exam + results demo for Riverbend Coaching (existing students).
-- Idempotent: wipes only this school's exam tables, then reloads ~3 months
-- of monthly/midterm exams with papers and marks for enrolled students.
--
-- Requires Riverbend students/sections/subjects from dev_riverbend.sql.
--
-- Apply:
--   npx supabase db query --linked -f supabase/fixtures/dev_riverbend_exams.sql
--   ./scripts/seed-dev-fixtures.sh --linked riverbend-exams

do $$
declare
  v_school_id uuid;
  v_year_id uuid;
  v_term1_id uuid;
  v_term2_id uuid;
  v_owner_id uuid;
  v_scale_id uuid;

  v_exam_ids uuid[] := array[
    'f0e10000-0000-4000-8000-000000000001'::uuid,
    'f0e10000-0000-4000-8000-000000000002'::uuid,
    'f0e10000-0000-4000-8000-000000000003'::uuid
  ];
  v_exam_names text[] := array[
    'Monthly Test — Month A',
    'Monthly Test — Month B',
    'Midterm Examination'
  ];
  v_exam_types text[] := array['monthly', 'monthly', 'midterm'];
  v_exam_status text[] := array['published', 'published', 'published'];

  -- Core subjects used across all class sections (fixed Riverbend IDs).
  v_subj_ids uuid[] := array[
    'f6666666-6666-4666-8666-666666666661'::uuid, -- Math
    'f6666666-6666-4666-8666-666666666662'::uuid, -- Eng
    'f6666666-6666-4666-8666-666666666663'::uuid, -- Phy
    'f6666666-6666-4666-8666-666666666664'::uuid, -- Chem
    'f6666666-6666-4666-8666-666666666666'::uuid  -- Urdu
  ];
  v_max_marks numeric[] := array[100, 100, 75, 75, 100];
  v_pass_marks numeric[] := array[40, 40, 30, 30, 40];

  v_month_a_start date;
  v_month_b_start date;
  v_mid_start date;

  r_section record;
  r_student record;
  v_exam_i int;
  v_subj_i int;
  v_paper_id uuid;
  v_exam_id uuid;
  v_starts date;
  v_ends date;
  v_term uuid;
  v_bucket int;
  v_marks numeric(8, 2);
  v_att text;
  v_count_exams int := 0;
  v_count_papers int := 0;
  v_count_marks int := 0;
  v_seq int;
begin
  select s.id into v_school_id
  from public.schools as s
  where s.name = 'Riverbend Coaching'
  order by s.created_at asc
  limit 1;

  if v_school_id is null then
    raise exception 'Riverbend Coaching school not found';
  end if;

  select y.id into v_year_id
  from public.school_academic_years as y
  where y.school_id = v_school_id
  order by y.is_current desc, y.starts_on desc
  limit 1;

  if v_year_id is null then
    raise exception 'Riverbend has no academic year — run dev_riverbend.sql first';
  end if;

  select t.id into v_term1_id
  from public.school_academic_terms as t
  where t.school_id = v_school_id
    and t.academic_year_id = v_year_id
  order by t.sort_order asc
  limit 1;

  select t.id into v_term2_id
  from public.school_academic_terms as t
  where t.school_id = v_school_id
    and t.academic_year_id = v_year_id
  order by t.sort_order desc
  limit 1;

  select m.user_id into v_owner_id
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.role = 'owner'
    and m.status = 'active'
  limit 1;

  if not exists (
    select 1 from public.school_students st where st.school_id = v_school_id
  ) then
    raise exception 'Riverbend has no students — run dev_riverbend.sql first';
  end if;

  -- Anchor exams across the last ~3 calendar months.
  v_month_a_start := date_trunc('month', current_date - interval '2 months')::date;
  v_month_b_start := date_trunc('month', current_date - interval '1 month')::date;
  v_mid_start := (current_date - 18);

  -- Wipe prior exam demo for this school only.
  delete from public.school_exam_marks where school_id = v_school_id;
  delete from public.school_exam_papers where school_id = v_school_id;
  delete from public.school_examinations where school_id = v_school_id;

  v_scale_id := public.ensure_school_default_grading_scale(v_school_id);

  for v_exam_i in 1..3 loop
    if v_exam_i = 1 then
      v_starts := v_month_a_start + 8;
      v_ends := v_month_a_start + 12;
      v_term := v_term1_id;
      v_exam_names[1] := 'Monthly Test — ' || to_char(v_month_a_start, 'Mon YYYY');
    elsif v_exam_i = 2 then
      v_starts := v_month_b_start + 8;
      v_ends := v_month_b_start + 12;
      v_term := v_term1_id;
      v_exam_names[2] := 'Monthly Test — ' || to_char(v_month_b_start, 'Mon YYYY');
    else
      v_starts := v_mid_start;
      v_ends := v_mid_start + 5;
      v_term := coalesce(v_term2_id, v_term1_id);
      v_exam_names[3] := 'Midterm Examination — ' || to_char(v_mid_start, 'Mon YYYY');
    end if;

    v_exam_id := v_exam_ids[v_exam_i];

    insert into public.school_examinations (
      id, school_id, academic_year_id, academic_term_id, grading_scale_id,
      name, exam_type, starts_on, ends_on, status, publish_ranks,
      published_at, published_by
    )
    values (
      v_exam_id,
      v_school_id,
      v_year_id,
      v_term,
      v_scale_id,
      v_exam_names[v_exam_i],
      v_exam_types[v_exam_i],
      v_starts,
      v_ends,
      'published',
      true,
      (v_ends + time '18:00')::timestamptz,
      v_owner_id
    );
    v_count_exams := v_count_exams + 1;

    v_seq := 0;
    for r_section in
      select sec.id as section_id, sec.grade_id
      from public.school_sections as sec
      where sec.school_id = v_school_id
        and sec.status = 'active'
      order by sec.grade_id, sec.name
    loop
      for v_subj_i in 1..array_length(v_subj_ids, 1) loop
        v_seq := v_seq + 1;
        v_paper_id := (
          'f0e20000-0000-4000-8000-' ||
          lpad(to_hex((v_exam_i * 1000) + v_seq), 12, '0')
        )::uuid;

        insert into public.school_exam_papers (
          id, school_id, examination_id, grade_id, section_id, subject_id,
          max_marks, pass_marks
        )
        values (
          v_paper_id,
          v_school_id,
          v_exam_id,
          r_section.grade_id,
          r_section.section_id,
          v_subj_ids[v_subj_i],
          v_max_marks[v_subj_i],
          v_pass_marks[v_subj_i]
        );
        v_count_papers := v_count_papers + 1;

        for r_student in
          select en.student_id
          from public.school_enrolments as en
          where en.school_id = v_school_id
            and en.academic_year_id = v_year_id
            and en.section_id = r_section.section_id
            and en.status = 'enrolled'
        loop
          v_bucket := mod(
            hashtext(
              r_student.student_id::text || v_exam_id::text || v_subj_i::text
            ),
            20
          );
          if v_bucket < 0 then
            v_bucket := v_bucket + 20;
          end if;

          if v_bucket = 0 then
            v_att := 'absent';
            v_marks := null;
          elsif v_bucket = 1 then
            v_att := 'exempt';
            v_marks := null;
          else
            v_att := 'present';
            -- Spread scores: mostly pass, some high distinction, some fail.
            if v_bucket <= 3 then
              v_marks := round(
                (v_pass_marks[v_subj_i] * 0.55)
                + (v_bucket::numeric),
                2
              );
            elsif v_bucket >= 17 then
              v_marks := round(
                v_max_marks[v_subj_i] * (0.88 + (v_bucket - 17) * 0.03),
                2
              );
            else
              v_marks := round(
                v_pass_marks[v_subj_i]
                + (v_max_marks[v_subj_i] - v_pass_marks[v_subj_i])
                  * (0.35 + v_bucket * 0.03),
                2
              );
            end if;
            if v_marks > v_max_marks[v_subj_i] then
              v_marks := v_max_marks[v_subj_i];
            end if;
            if v_marks < 0 then
              v_marks := 0;
            end if;
          end if;

          insert into public.school_exam_marks (
            school_id, paper_id, student_id,
            marks_obtained, attendance_status, remarks
          )
          values (
            v_school_id,
            v_paper_id,
            r_student.student_id,
            v_marks,
            v_att,
            case
              when v_att = 'absent' then 'Did not appear'
              when v_att = 'exempt' then 'Medical exemption'
              when v_marks is not null and v_marks < v_pass_marks[v_subj_i]
                then 'Needs improvement'
              else null
            end
          );
          v_count_marks := v_count_marks + 1;
        end loop;
      end loop;
    end loop;
  end loop;

  raise notice 'Riverbend exam demo loaded for school %', v_school_id;
  raise notice '  examinations=% papers=% marks=%',
    v_count_exams, v_count_papers, v_count_marks;
end;
$$;
