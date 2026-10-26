-- Phase 11 continued: school daily section attendance (draft → submit)
-- Teacher/manager recording. No period-wise, notifications, or offline sync yet.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_record_school_attendance(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.school_memberships as m
    where m.school_id = p_school_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'teacher')
  );
$$;

comment on function public.can_record_school_attendance(uuid) is
  'True when the current user may open/save/submit attendance for a school. '
  'Section assignment scoping is deferred.';

revoke all on function public.can_record_school_attendance(uuid) from public;
grant execute on function public.can_record_school_attendance(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- school_attendance_sessions
-- ---------------------------------------------------------------------------

create table public.school_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  section_id uuid not null
    references public.school_sections (id)
    on delete restrict,
  attendance_date date not null,
  status text not null default 'draft',
  opened_by uuid
    references auth.users (id)
    on delete set null,
  submitted_by uuid
    references auth.users (id)
    on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_attendance_sessions_status_valid check (
    status in ('draft', 'submitted')
  ),
  constraint school_attendance_sessions_section_date_unique
    unique (section_id, attendance_date),
  constraint school_attendance_sessions_submit_consistency check (
    (status = 'draft' and submitted_at is null and submitted_by is null)
    or (status = 'submitted' and submitted_at is not null)
  )
);

comment on table public.school_attendance_sessions is
  'Daily attendance session for a school section (draft until explicitly submitted).';

create index school_attendance_sessions_school_id_idx
  on public.school_attendance_sessions (school_id);
create index school_attendance_sessions_section_date_idx
  on public.school_attendance_sessions (section_id, attendance_date desc);

create trigger school_attendance_sessions_set_updated_at
before update on public.school_attendance_sessions
for each row execute function public.set_updated_at();

create trigger school_attendance_sessions_reject_school_id_change
before update on public.school_attendance_sessions
for each row execute function public.reject_school_id_change();

alter table public.school_attendance_sessions enable row level security;
alter table public.school_attendance_sessions force row level security;
revoke all on table public.school_attendance_sessions from anon, authenticated;
grant select on table public.school_attendance_sessions to authenticated;

create policy school_attendance_sessions_select_member
on public.school_attendance_sessions
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_attendance_marks
-- ---------------------------------------------------------------------------

create table public.school_attendance_marks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  session_id uuid not null
    references public.school_attendance_sessions (id)
    on delete cascade,
  student_id uuid not null
    references public.school_students (id)
    on delete restrict,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_attendance_marks_status_valid check (
    status in ('present', 'absent', 'late', 'excused', 'leave')
  ),
  constraint school_attendance_marks_note_length check (
    note is null or length(note) <= 500
  ),
  constraint school_attendance_marks_session_student_unique
    unique (session_id, student_id)
);

comment on table public.school_attendance_marks is
  'Per-student attendance status within a school attendance session.';

create index school_attendance_marks_school_id_idx
  on public.school_attendance_marks (school_id);
create index school_attendance_marks_session_id_idx
  on public.school_attendance_marks (session_id);
create index school_attendance_marks_student_id_idx
  on public.school_attendance_marks (student_id);

create trigger school_attendance_marks_set_updated_at
before update on public.school_attendance_marks
for each row execute function public.set_updated_at();

create trigger school_attendance_marks_reject_school_id_change
before update on public.school_attendance_marks
for each row execute function public.reject_school_id_change();

alter table public.school_attendance_marks enable row level security;
alter table public.school_attendance_marks force row level security;
revoke all on table public.school_attendance_marks from anon, authenticated;
grant select on table public.school_attendance_marks to authenticated;

create policy school_attendance_marks_select_member
on public.school_attendance_marks
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- open_school_attendance_session
-- Idempotent: returns existing session for section + date.
-- Seeds marks for currently enrolled students in that section (default present).
-- ---------------------------------------------------------------------------

create or replace function public.open_school_attendance_session(
  p_school_id uuid,
  p_section_id uuid,
  p_attendance_date date
)
returns table (
  session_id uuid,
  school_id uuid,
  section_id uuid,
  attendance_date date,
  status text,
  mark_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_section_school uuid;
  v_id uuid;
  v_status text;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null or p_section_id is null or p_attendance_date is null then
    raise exception 'school, section, and date are required' using errcode = '22023';
  end if;
  if not public.can_record_school_attendance(p_school_id) then
    raise exception 'Not authorized to record attendance' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'School workflows are not enabled for this institution'
      using errcode = '22023';
  end if;

  select s.school_id into v_section_school
  from public.school_sections as s
  where s.id = p_section_id
    and s.status = 'active';
  if not found then
    raise exception 'Section not found' using errcode = 'P0002';
  end if;
  if v_section_school is distinct from p_school_id then
    raise exception 'Section does not belong to this school' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select sess.id, sess.status into v_id, v_status
  from public.school_attendance_sessions as sess
  where sess.section_id = p_section_id
    and sess.attendance_date = p_attendance_date;

  if found then
    select count(*)::integer into v_count
    from public.school_attendance_marks as mk
    where mk.session_id = v_id;

    session_id := v_id;
    school_id := p_school_id;
    section_id := p_section_id;
    attendance_date := p_attendance_date;
    status := v_status;
    mark_count := coalesce(v_count, 0);
    return next;
    return;
  end if;

  insert into public.school_attendance_sessions (
    school_id, section_id, attendance_date, status, opened_by
  )
  values (
    p_school_id, p_section_id, p_attendance_date, 'draft', v_user_id
  )
  returning id into v_id;

  insert into public.school_attendance_marks (
    school_id, session_id, student_id, status
  )
  select
    p_school_id,
    v_id,
    e.student_id,
    'present'
  from public.school_enrolments as e
  inner join public.school_students as st on st.id = e.student_id
  where e.school_id = p_school_id
    and e.section_id = p_section_id
    and e.status = 'enrolled'
    and st.status = 'active';

  get diagnostics v_count = row_count;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.attendance.session_opened',
    'school_attendance_session',
    v_id,
    jsonb_build_object(
      'section_id', p_section_id,
      'attendance_date', p_attendance_date,
      'mark_count', v_count
    ),
    'success',
    v_role,
    p_school_id
  );

  session_id := v_id;
  school_id := p_school_id;
  section_id := p_section_id;
  attendance_date := p_attendance_date;
  status := 'draft';
  mark_count := coalesce(v_count, 0);
  return next;
end;
$$;

revoke all on function public.open_school_attendance_session(uuid, uuid, date)
  from public, anon;
grant execute on function public.open_school_attendance_session(uuid, uuid, date)
  to authenticated;

-- ---------------------------------------------------------------------------
-- save_school_attendance_marks (draft only)
-- p_marks: [{"student_id":"...","status":"absent","note":"..."}, ...]
-- ---------------------------------------------------------------------------

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
         'present', 'absent', 'late', 'excused', 'leave'
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

-- ---------------------------------------------------------------------------
-- submit_school_attendance_session
-- ---------------------------------------------------------------------------

create or replace function public.submit_school_attendance_session(
  p_session_id uuid
)
returns table (
  session_id uuid,
  status text,
  submitted_at timestamptz
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
  v_submitted_at timestamptz;
  v_mark_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_session_id is null then
    raise exception 'session is required' using errcode = '22023';
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
  if v_status = 'submitted' then
    raise exception 'Attendance session is already submitted'
      using errcode = '22023';
  end if;

  select count(*)::integer into v_mark_count
  from public.school_attendance_marks as mk
  where mk.session_id = p_session_id;
  if coalesce(v_mark_count, 0) < 1 then
    raise exception 'Cannot submit an empty attendance roster'
      using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  v_submitted_at := now();
  update public.school_attendance_sessions as s
  set status = 'submitted',
      submitted_by = v_user_id,
      submitted_at = v_submitted_at
  where s.id = p_session_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.attendance.session_submitted',
    'school_attendance_session',
    p_session_id,
    jsonb_build_object('mark_count', v_mark_count),
    'success',
    v_role,
    v_school_id
  );

  session_id := p_session_id;
  status := 'submitted';
  submitted_at := v_submitted_at;
  return next;
end;
$$;

revoke all on function public.submit_school_attendance_session(uuid)
  from public, anon;
grant execute on function public.submit_school_attendance_session(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- correct_school_attendance_mark (submitted sessions; managers only)
-- ---------------------------------------------------------------------------

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
     or v_status not in ('present', 'absent', 'late', 'excused', 'leave') then
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
