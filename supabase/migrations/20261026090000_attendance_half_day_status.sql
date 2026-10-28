-- Add half_day attendance status while keeping leave for existing marks.

alter table public.school_attendance_marks
  drop constraint school_attendance_marks_status_valid;

alter table public.school_attendance_marks
  add constraint school_attendance_marks_status_valid check (
    status in ('present', 'absent', 'late', 'excused', 'half_day', 'leave')
  );

create or replace function public.save_school_attendance_marks(
  p_session_id uuid,
  p_marks jsonb
)
returns table (
  session_id uuid,
  updated_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_status text;
  v_item jsonb;
  v_student_id uuid;
  v_mark_status text;
  v_note text;
  v_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_session_id is null then
    raise exception 'session is required' using errcode = '22023';
  end if;
  if p_marks is null or jsonb_typeof(p_marks) <> 'array' then
    raise exception 'marks must be a JSON array' using errcode = '22023';
  end if;

  select s.school_id, s.status into v_school_id, v_status
  from public.school_attendance_sessions as s
  where s.id = p_session_id;
  if not found then
    raise exception 'Attendance session not found' using errcode = 'P0002';
  end if;
  if not public.can_record_school_attendance(v_school_id) then
    raise exception 'Not authorized to record attendance' using errcode = '42501';
  end if;
  if v_status <> 'draft' then
    raise exception 'Submitted attendance cannot be bulk-edited; use correction'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  for v_item in select * from jsonb_array_elements(p_marks)
  loop
    begin
      v_student_id := (v_item ->> 'student_id')::uuid;
    exception
      when others then
        raise exception 'Invalid student_id in marks' using errcode = '22023';
    end;
    v_mark_status := nullif(trim(v_item ->> 'status'), '');
    if v_mark_status is null
       or v_mark_status not in (
         'present', 'absent', 'late', 'excused', 'half_day', 'leave'
       ) then
      raise exception 'Invalid attendance status' using errcode = '22023';
    end if;
    v_note := nullif(trim(v_item ->> 'note'), '');
    if v_note is not null and length(v_note) > 500 then
      raise exception 'Note must be 500 characters or fewer' using errcode = '22023';
    end if;

    update public.school_attendance_marks as mk
    set status = v_mark_status,
        note = v_note
    where mk.session_id = p_session_id
      and mk.student_id = v_student_id;

    if found then
      v_updated := v_updated + 1;
    else
      raise exception 'Student is not on this attendance roster'
        using errcode = 'P0002';
    end if;
  end loop;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.attendance.marks_saved',
    'school_attendance_session',
    p_session_id,
    jsonb_build_object('updated_count', v_updated),
    'success',
    v_role,
    v_school_id
  );

  session_id := p_session_id;
  updated_count := v_updated;
  return next;
end;
$$;

revoke all on function public.save_school_attendance_marks(uuid, jsonb)
  from public, anon;
grant execute on function public.save_school_attendance_marks(uuid, jsonb)
  to authenticated;

create or replace function public.correct_school_attendance_mark(
  p_mark_id uuid,
  p_status text,
  p_reason text
)
returns table (
  mark_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_session_status text;
  v_old jsonb;
  v_status text := nullif(trim(p_status), '');
  v_reason text := nullif(trim(p_reason), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_mark_id is null then
    raise exception 'mark is required' using errcode = '22023';
  end if;
  if v_status is null
     or v_status not in (
       'present', 'absent', 'late', 'excused', 'half_day', 'leave'
     ) then
    raise exception 'Invalid attendance status' using errcode = '22023';
  end if;
  if v_reason is null or length(v_reason) < 3 then
    raise exception 'Correction reason is required' using errcode = '22023';
  end if;
  if length(v_reason) > 500 then
    raise exception 'Reason must be 500 characters or fewer' using errcode = '22023';
  end if;

  select mk.school_id,
         jsonb_build_object(
           'status', mk.status,
           'note', mk.note,
           'student_id', mk.student_id,
           'session_id', mk.session_id
         ),
         sess.status
    into v_school_id, v_old, v_session_status
  from public.school_attendance_marks as mk
  inner join public.school_attendance_sessions as sess
    on sess.id = mk.session_id
  where mk.id = p_mark_id;
  if not found then
    raise exception 'Attendance mark not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to correct attendance' using errcode = '42501';
  end if;
  if v_session_status <> 'submitted' then
    raise exception 'Use save for draft attendance; correction is for submitted only'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_attendance_marks as mk
  set status = v_status
  where mk.id = p_mark_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.attendance.mark_corrected',
    'school_attendance_mark',
    p_mark_id,
    jsonb_build_object(
      'before', v_old,
      'after_status', v_status,
      'reason', v_reason
    ),
    'success',
    v_role,
    v_school_id
  );

  mark_id := p_mark_id;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.correct_school_attendance_mark(uuid, text, text)
  from public, anon;
grant execute on function public.correct_school_attendance_mark(uuid, text, text)
  to authenticated;
