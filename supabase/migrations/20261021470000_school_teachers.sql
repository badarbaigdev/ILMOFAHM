-- Phase 11 continued: school teacher HR directory
-- Staff profiles only. Login access remains school_memberships invitations.

-- ---------------------------------------------------------------------------
-- school_teachers
-- ---------------------------------------------------------------------------

create table public.school_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  staff_number text not null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  primary_subject text,
  status text not null default 'active',
  user_id uuid
    references public.profiles (id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_teachers_staff_number_not_blank
    check (length(trim(staff_number)) > 0),
  constraint school_teachers_first_name_not_blank
    check (length(trim(first_name)) > 0),
  constraint school_teachers_last_name_not_blank
    check (length(trim(last_name)) > 0),
  constraint school_teachers_status_valid check (
    status in ('active', 'inactive', 'archived')
  ),
  constraint school_teachers_email_format check (
    email is null
    or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint school_teachers_school_staff_number_unique
    unique (school_id, staff_number)
);

comment on table public.school_teachers is
  'Teacher HR directory records scoped to a school. Optional user_id links login later.';

create index school_teachers_school_id_idx on public.school_teachers (school_id);
create index school_teachers_school_status_idx
  on public.school_teachers (school_id, status);
create index school_teachers_user_id_idx
  on public.school_teachers (user_id)
  where user_id is not null;

create trigger school_teachers_set_updated_at
before update on public.school_teachers
for each row execute function public.set_updated_at();

create trigger school_teachers_reject_school_id_change
before update on public.school_teachers
for each row execute function public.reject_school_id_change();

alter table public.school_teachers enable row level security;
alter table public.school_teachers force row level security;
revoke all on table public.school_teachers from anon, authenticated;
grant select on table public.school_teachers to authenticated;

create policy school_teachers_select_member
on public.school_teachers
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_teacher
-- ---------------------------------------------------------------------------

create or replace function public.create_school_teacher(
  p_school_id uuid,
  p_staff_number text,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null,
  p_primary_subject text default null
)
returns table (
  teacher_id uuid,
  school_id uuid,
  staff_number text,
  first_name text,
  last_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_staff text := nullif(trim(p_staff_number), '');
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_subject text := nullif(trim(p_primary_subject), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage teachers' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Teachers require a school or mixed institution'
      using errcode = '22023';
  end if;
  if v_staff is null then
    raise exception 'Staff number is required' using errcode = '22023';
  end if;
  if v_first is null or v_last is null then
    raise exception 'First and last name are required' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid email is required' using errcode = '22023';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_teachers (
    school_id, staff_number, first_name, last_name, email, phone, primary_subject
  )
  values (
    p_school_id, v_staff, v_first, v_last, v_email, v_phone, v_subject
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.teacher.created',
    'school_teacher',
    v_id,
    jsonb_build_object(
      'staff_number', v_staff,
      'first_name', v_first,
      'last_name', v_last
    ),
    'success',
    v_role,
    p_school_id
  );

  teacher_id := v_id;
  school_id := p_school_id;
  staff_number := v_staff;
  first_name := v_first;
  last_name := v_last;
  return next;
end;
$$;

revoke all on function public.create_school_teacher(
  uuid, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_school_teacher(
  uuid, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- archive_school_teacher
-- ---------------------------------------------------------------------------

create or replace function public.archive_school_teacher(
  p_teacher_id uuid
)
returns table (
  teacher_id uuid,
  school_id uuid,
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
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_teacher_id is null then
    raise exception 'teacher_id is required' using errcode = '22023';
  end if;

  select t.school_id into v_school_id
  from public.school_teachers as t
  where t.id = p_teacher_id;

  if v_school_id is null then
    raise exception 'Teacher not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage teachers' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_teachers as t
  set status = 'archived'
  where t.id = p_teacher_id
  returning t.status into v_status;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.teacher.archived',
    'school_teacher',
    p_teacher_id,
    jsonb_build_object('status', v_status),
    'success',
    v_role,
    v_school_id
  );

  teacher_id := p_teacher_id;
  school_id := v_school_id;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.archive_school_teacher(uuid) from public, anon;
grant execute on function public.archive_school_teacher(uuid) to authenticated;
