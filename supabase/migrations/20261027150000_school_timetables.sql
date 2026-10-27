-- School weekly timetables: rooms + period entries with teacher/section/room conflicts.

-- ---------------------------------------------------------------------------
-- school_rooms
-- ---------------------------------------------------------------------------

create table if not exists public.school_rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_rooms_name_not_blank check (length(trim(name)) > 0),
  constraint school_rooms_status_valid check (status in ('active', 'archived')),
  constraint school_rooms_school_name_unique unique (school_id, name)
);

comment on table public.school_rooms is
  'Physical or named classrooms used in school timetable periods.';

create index if not exists school_rooms_school_id_idx
  on public.school_rooms (school_id);

drop trigger if exists school_rooms_set_updated_at on public.school_rooms;
create trigger school_rooms_set_updated_at
before update on public.school_rooms
for each row execute function public.set_updated_at();

drop trigger if exists school_rooms_reject_school_id_change on public.school_rooms;
create trigger school_rooms_reject_school_id_change
before update on public.school_rooms
for each row execute function public.reject_school_id_change();

alter table public.school_rooms enable row level security;
alter table public.school_rooms force row level security;
revoke all on table public.school_rooms from anon, authenticated;
grant select on table public.school_rooms to authenticated;

drop policy if exists school_rooms_select_member on public.school_rooms;
create policy school_rooms_select_member
on public.school_rooms
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_timetable_entries
-- ---------------------------------------------------------------------------

create table if not exists public.school_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  section_id uuid not null
    references public.school_sections (id)
    on delete restrict,
  subject_id uuid not null
    references public.school_subjects (id)
    on delete restrict,
  teacher_id uuid not null
    references public.school_teachers (id)
    on delete restrict,
  room_id uuid
    references public.school_rooms (id)
    on delete restrict,
  day_of_week smallint not null,
  starts_at time not null,
  ends_at time not null,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_timetable_entries_day_valid check (
    day_of_week between 1 and 7
  ),
  constraint school_timetable_entries_time_order check (ends_at > starts_at),
  constraint school_timetable_entries_status_valid check (
    status in ('active', 'cancelled')
  ),
  constraint school_timetable_entries_notes_length check (
    notes is null or length(notes) <= 500
  )
);

comment on table public.school_timetable_entries is
  'Weekly lesson periods for a school section (day_of_week ISO: 1=Mon … 7=Sun).';

create index if not exists school_timetable_entries_school_id_idx
  on public.school_timetable_entries (school_id);
create index if not exists school_timetable_entries_section_day_idx
  on public.school_timetable_entries (section_id, day_of_week, starts_at);
create index if not exists school_timetable_entries_teacher_day_idx
  on public.school_timetable_entries (teacher_id, day_of_week, starts_at);
create index if not exists school_timetable_entries_room_day_idx
  on public.school_timetable_entries (room_id, day_of_week, starts_at)
  where room_id is not null;

drop trigger if exists school_timetable_entries_set_updated_at
  on public.school_timetable_entries;
create trigger school_timetable_entries_set_updated_at
before update on public.school_timetable_entries
for each row execute function public.set_updated_at();

drop trigger if exists school_timetable_entries_reject_school_id_change
  on public.school_timetable_entries;
create trigger school_timetable_entries_reject_school_id_change
before update on public.school_timetable_entries
for each row execute function public.reject_school_id_change();

alter table public.school_timetable_entries enable row level security;
alter table public.school_timetable_entries force row level security;
revoke all on table public.school_timetable_entries from anon, authenticated;
grant select on table public.school_timetable_entries to authenticated;

drop policy if exists school_timetable_entries_select_member
  on public.school_timetable_entries;
create policy school_timetable_entries_select_member
on public.school_timetable_entries
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- Conflict helper: half-open style overlap on same day
-- ---------------------------------------------------------------------------

create or replace function public.school_timetable_times_overlap(
  p_starts_a time,
  p_ends_a time,
  p_starts_b time,
  p_ends_b time
)
returns boolean
language sql
immutable
as $$
  select p_starts_a < p_ends_b and p_ends_a > p_starts_b;
$$;

create or replace function public.assert_school_timetable_no_conflicts(
  p_school_id uuid,
  p_entry_id uuid,
  p_section_id uuid,
  p_teacher_id uuid,
  p_room_id uuid,
  p_day_of_week smallint,
  p_starts_at time,
  p_ends_at time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict text;
begin
  select
    case
      when e.section_id = p_section_id then 'section'
      when e.teacher_id = p_teacher_id then 'teacher'
      when p_room_id is not null and e.room_id = p_room_id then 'room'
      else null
    end
  into v_conflict
  from public.school_timetable_entries as e
  where e.school_id = p_school_id
    and e.status = 'active'
    and e.day_of_week = p_day_of_week
    and (p_entry_id is null or e.id <> p_entry_id)
    and public.school_timetable_times_overlap(
      e.starts_at, e.ends_at, p_starts_at, p_ends_at
    )
    and (
      e.section_id = p_section_id
      or e.teacher_id = p_teacher_id
      or (p_room_id is not null and e.room_id = p_room_id)
    )
  limit 1;

  if v_conflict = 'section' then
    raise exception 'This class already has a lesson overlapping that time'
      using errcode = '23505';
  end if;
  if v_conflict = 'teacher' then
    raise exception 'This teacher already has a lesson overlapping that time'
      using errcode = '23505';
  end if;
  if v_conflict = 'room' then
    raise exception 'This classroom is already booked overlapping that time'
      using errcode = '23505';
  end if;
end;
$$;

revoke all on function public.assert_school_timetable_no_conflicts(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time
) from public, anon;
grant execute on function public.assert_school_timetable_no_conflicts(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time
) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_room
-- ---------------------------------------------------------------------------

create or replace function public.create_school_room(
  p_school_id uuid,
  p_name text
)
returns table (
  room_id uuid,
  school_id uuid,
  name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage rooms' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Room name is required' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_rooms (school_id, name)
  values (p_school_id, v_name)
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.room.created',
    'school_room',
    v_id,
    jsonb_build_object('name', v_name),
    'success',
    v_role,
    p_school_id
  );

  room_id := v_id;
  school_id := p_school_id;
  name := v_name;
  return next;
end;
$$;

revoke all on function public.create_school_room(uuid, text) from public, anon;
grant execute on function public.create_school_room(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- create_school_timetable_entry
-- ---------------------------------------------------------------------------

create or replace function public.create_school_timetable_entry(
  p_school_id uuid,
  p_section_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_room_id uuid,
  p_day_of_week smallint,
  p_starts_at time,
  p_ends_at time,
  p_notes text default null
)
returns table (
  entry_id uuid,
  school_id uuid,
  section_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_notes text := nullif(trim(p_notes), '');
  v_id uuid;
  v_section_school uuid;
  v_subject_school uuid;
  v_teacher_school uuid;
  v_room_school uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null or p_section_id is null
     or p_subject_id is null or p_teacher_id is null then
    raise exception 'School, section, subject, and teacher are required'
      using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage timetables'
      using errcode = '42501';
  end if;
  if p_day_of_week is null or p_day_of_week < 1 or p_day_of_week > 7 then
    raise exception 'Day of week must be 1 (Mon) through 7 (Sun)'
      using errcode = '22023';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'End time must be after start time' using errcode = '22023';
  end if;

  select s.school_id into v_section_school
  from public.school_sections as s
  where s.id = p_section_id and s.status = 'active';
  if not found or v_section_school <> p_school_id then
    raise exception 'Section not found in this school' using errcode = 'P0002';
  end if;

  select sub.school_id into v_subject_school
  from public.school_subjects as sub
  where sub.id = p_subject_id and sub.status = 'active';
  if not found or v_subject_school <> p_school_id then
    raise exception 'Subject not found in this school' using errcode = 'P0002';
  end if;

  select t.school_id into v_teacher_school
  from public.school_teachers as t
  where t.id = p_teacher_id and t.status = 'active';
  if not found or v_teacher_school <> p_school_id then
    raise exception 'Teacher not found in this school' using errcode = 'P0002';
  end if;

  if p_room_id is not null then
    select r.school_id into v_room_school
    from public.school_rooms as r
    where r.id = p_room_id and r.status = 'active';
    if not found or v_room_school <> p_school_id then
      raise exception 'Room not found in this school' using errcode = 'P0002';
    end if;
  end if;

  perform public.assert_school_timetable_no_conflicts(
    p_school_id,
    null,
    p_section_id,
    p_teacher_id,
    p_room_id,
    p_day_of_week,
    p_starts_at,
    p_ends_at
  );

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_timetable_entries (
    school_id,
    section_id,
    subject_id,
    teacher_id,
    room_id,
    day_of_week,
    starts_at,
    ends_at,
    notes
  )
  values (
    p_school_id,
    p_section_id,
    p_subject_id,
    p_teacher_id,
    p_room_id,
    p_day_of_week,
    p_starts_at,
    p_ends_at,
    v_notes
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.timetable.created',
    'school_timetable_entry',
    v_id,
    jsonb_build_object(
      'section_id', p_section_id,
      'subject_id', p_subject_id,
      'teacher_id', p_teacher_id,
      'room_id', p_room_id,
      'day_of_week', p_day_of_week,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    ),
    'success',
    v_role,
    p_school_id
  );

  entry_id := v_id;
  school_id := p_school_id;
  section_id := p_section_id;
  return next;
end;
$$;

revoke all on function public.create_school_timetable_entry(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time, text
) from public, anon;
grant execute on function public.create_school_timetable_entry(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_timetable_entry
-- ---------------------------------------------------------------------------

create or replace function public.update_school_timetable_entry(
  p_entry_id uuid,
  p_section_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid,
  p_room_id uuid,
  p_day_of_week smallint,
  p_starts_at time,
  p_ends_at time,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_notes text := nullif(trim(p_notes), '');
  v_section_school uuid;
  v_subject_school uuid;
  v_teacher_school uuid;
  v_room_school uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select e.school_id into v_school_id
  from public.school_timetable_entries as e
  where e.id = p_entry_id
  for update;

  if not found then
    raise exception 'Timetable entry not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage timetables'
      using errcode = '42501';
  end if;
  if p_day_of_week is null or p_day_of_week < 1 or p_day_of_week > 7 then
    raise exception 'Day of week must be 1 (Mon) through 7 (Sun)'
      using errcode = '22023';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'End time must be after start time' using errcode = '22023';
  end if;

  select s.school_id into v_section_school
  from public.school_sections as s
  where s.id = p_section_id and s.status = 'active';
  if not found or v_section_school <> v_school_id then
    raise exception 'Section not found in this school' using errcode = 'P0002';
  end if;

  select sub.school_id into v_subject_school
  from public.school_subjects as sub
  where sub.id = p_subject_id and sub.status = 'active';
  if not found or v_subject_school <> v_school_id then
    raise exception 'Subject not found in this school' using errcode = 'P0002';
  end if;

  select t.school_id into v_teacher_school
  from public.school_teachers as t
  where t.id = p_teacher_id and t.status = 'active';
  if not found or v_teacher_school <> v_school_id then
    raise exception 'Teacher not found in this school' using errcode = 'P0002';
  end if;

  if p_room_id is not null then
    select r.school_id into v_room_school
    from public.school_rooms as r
    where r.id = p_room_id and r.status = 'active';
    if not found or v_room_school <> v_school_id then
      raise exception 'Room not found in this school' using errcode = 'P0002';
    end if;
  end if;

  perform public.assert_school_timetable_no_conflicts(
    v_school_id,
    p_entry_id,
    p_section_id,
    p_teacher_id,
    p_room_id,
    p_day_of_week,
    p_starts_at,
    p_ends_at
  );

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_timetable_entries
  set section_id = p_section_id,
      subject_id = p_subject_id,
      teacher_id = p_teacher_id,
      room_id = p_room_id,
      day_of_week = p_day_of_week,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      notes = v_notes,
      status = 'active'
  where id = p_entry_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.timetable.updated',
    'school_timetable_entry',
    p_entry_id,
    jsonb_build_object(
      'section_id', p_section_id,
      'subject_id', p_subject_id,
      'teacher_id', p_teacher_id,
      'room_id', p_room_id,
      'day_of_week', p_day_of_week,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    ),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.update_school_timetable_entry(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time, text
) from public, anon;
grant execute on function public.update_school_timetable_entry(
  uuid, uuid, uuid, uuid, uuid, smallint, time, time, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_school_timetable_entry (soft cancel)
-- ---------------------------------------------------------------------------

create or replace function public.delete_school_timetable_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select e.school_id into v_school_id
  from public.school_timetable_entries as e
  where e.id = p_entry_id
  for update;

  if not found then
    raise exception 'Timetable entry not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage timetables'
      using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_timetable_entries
  set status = 'cancelled'
  where id = p_entry_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.timetable.cancelled',
    'school_timetable_entry',
    p_entry_id,
    jsonb_build_object('status', 'cancelled'),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.delete_school_timetable_entry(uuid)
  from public, anon;
grant execute on function public.delete_school_timetable_entry(uuid)
  to authenticated;
