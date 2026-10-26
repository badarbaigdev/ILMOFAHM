-- Phase 11 continued: school guardians + student relationship links
-- Contact records only. No parent Auth/portal invitation yet.

-- ---------------------------------------------------------------------------
-- school_guardians
-- ---------------------------------------------------------------------------

create table public.school_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_guardians_first_name_not_blank
    check (length(trim(first_name)) > 0),
  constraint school_guardians_last_name_not_blank
    check (length(trim(last_name)) > 0),
  constraint school_guardians_status_valid check (
    status in ('active', 'inactive', 'archived')
  ),
  constraint school_guardians_email_format check (
    email is null
    or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

comment on table public.school_guardians is
  'Guardian/contact records scoped to a school. Portal Auth linking is deferred.';

create index school_guardians_school_id_idx on public.school_guardians (school_id);

create trigger school_guardians_set_updated_at
before update on public.school_guardians
for each row execute function public.set_updated_at();

create trigger school_guardians_reject_school_id_change
before update on public.school_guardians
for each row execute function public.reject_school_id_change();

alter table public.school_guardians enable row level security;
alter table public.school_guardians force row level security;
revoke all on table public.school_guardians from anon, authenticated;
grant select on table public.school_guardians to authenticated;

create policy school_guardians_select_member
on public.school_guardians
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- school_student_guardians
-- ---------------------------------------------------------------------------

create table public.school_student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  student_id uuid not null
    references public.school_students (id)
    on delete restrict,
  guardian_id uuid not null
    references public.school_guardians (id)
    on delete restrict,
  relationship text not null,
  is_primary boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_student_guardians_relationship_valid check (
    relationship in (
      'mother', 'father', 'guardian', 'grandparent', 'sibling', 'other'
    )
  ),
  constraint school_student_guardians_status_valid check (
    status in ('active', 'inactive', 'revoked')
  ),
  constraint school_student_guardians_pair_unique unique (student_id, guardian_id)
);

comment on table public.school_student_guardians is
  'Verified staff-managed link between a student and a guardian contact.';

create index school_student_guardians_school_id_idx
  on public.school_student_guardians (school_id);
create index school_student_guardians_student_id_idx
  on public.school_student_guardians (student_id);
create index school_student_guardians_guardian_id_idx
  on public.school_student_guardians (guardian_id);

create unique index school_student_guardians_one_primary
  on public.school_student_guardians (student_id)
  where is_primary and status = 'active';

create trigger school_student_guardians_set_updated_at
before update on public.school_student_guardians
for each row execute function public.set_updated_at();

create trigger school_student_guardians_reject_school_id_change
before update on public.school_student_guardians
for each row execute function public.reject_school_id_change();

alter table public.school_student_guardians enable row level security;
alter table public.school_student_guardians force row level security;
revoke all on table public.school_student_guardians from anon, authenticated;
grant select on table public.school_student_guardians to authenticated;

create policy school_student_guardians_select_member
on public.school_student_guardians
for select to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- ---------------------------------------------------------------------------
-- create_school_guardian
-- ---------------------------------------------------------------------------

create or replace function public.create_school_guardian(
  p_school_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null
)
returns table (
  guardian_id uuid,
  school_id uuid,
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
  v_first text := nullif(trim(p_first_name), '');
  v_last text := nullif(trim(p_last_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_school_id is null then
    raise exception 'school_id is required' using errcode = '22023';
  end if;
  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage guardians' using errcode = '42501';
  end if;
  if not public.school_supports_school_workflows(p_school_id) then
    raise exception 'Guardians require a school or mixed institution'
      using errcode = '22023';
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

  insert into public.school_guardians (
    school_id, first_name, last_name, email, phone
  )
  values (p_school_id, v_first, v_last, v_email, v_phone)
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.guardian.created',
    'school_guardian',
    v_id,
    jsonb_build_object(
      'first_name', v_first,
      'last_name', v_last,
      'email', v_email
    ),
    'success',
    v_role,
    p_school_id
  );

  guardian_id := v_id;
  school_id := p_school_id;
  first_name := v_first;
  last_name := v_last;
  return next;
end;
$$;

revoke all on function public.create_school_guardian(
  uuid, text, text, text, text
) from public, anon;
grant execute on function public.create_school_guardian(
  uuid, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- link_school_student_guardian
-- ---------------------------------------------------------------------------

create or replace function public.link_school_student_guardian(
  p_student_id uuid,
  p_guardian_id uuid,
  p_relationship text,
  p_is_primary boolean default false
)
returns table (
  link_id uuid,
  school_id uuid,
  student_id uuid,
  guardian_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_student_school uuid;
  v_guardian_school uuid;
  v_rel text := nullif(trim(p_relationship), '');
  v_primary boolean := coalesce(p_is_primary, false);
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_student_id is null or p_guardian_id is null then
    raise exception 'student and guardian are required' using errcode = '22023';
  end if;
  if v_rel is null
     or v_rel not in (
       'mother', 'father', 'guardian', 'grandparent', 'sibling', 'other'
     ) then
    raise exception 'Invalid relationship' using errcode = '22023';
  end if;

  select s.school_id into v_student_school
  from public.school_students as s
  where s.id = p_student_id;
  if not found then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;

  select g.school_id into v_guardian_school
  from public.school_guardians as g
  where g.id = p_guardian_id
    and g.status = 'active';
  if not found then
    raise exception 'Guardian not found' using errcode = 'P0002';
  end if;

  if v_student_school is distinct from v_guardian_school then
    raise exception 'Student and guardian must belong to the same school'
      using errcode = '22023';
  end if;

  v_school_id := v_student_school;

  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage guardians' using errcode = '42501';
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  if v_primary then
    update public.school_student_guardians as l
    set is_primary = false
    where l.student_id = p_student_id
      and l.is_primary
      and l.status = 'active';
  end if;

  insert into public.school_student_guardians (
    school_id, student_id, guardian_id, relationship, is_primary
  )
  values (
    v_school_id, p_student_id, p_guardian_id, v_rel, v_primary
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student_guardian.linked',
    'school_student_guardian',
    v_id,
    jsonb_build_object(
      'student_id', p_student_id,
      'guardian_id', p_guardian_id,
      'relationship', v_rel,
      'is_primary', v_primary
    ),
    'success',
    v_role,
    v_school_id
  );

  link_id := v_id;
  school_id := v_school_id;
  student_id := p_student_id;
  guardian_id := p_guardian_id;
  return next;
exception
  when unique_violation then
    raise exception 'This guardian is already linked to the student'
      using errcode = '23505';
end;
$$;

revoke all on function public.link_school_student_guardian(
  uuid, uuid, text, boolean
) from public, anon;
grant execute on function public.link_school_student_guardian(
  uuid, uuid, text, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- unlink_school_student_guardian (soft revoke)
-- ---------------------------------------------------------------------------

create or replace function public.unlink_school_student_guardian(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
  v_old jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select l.school_id,
         jsonb_build_object(
           'student_id', l.student_id,
           'guardian_id', l.guardian_id,
           'status', l.status,
           'is_primary', l.is_primary
         )
  into v_school_id, v_old
  from public.school_student_guardians as l
  where l.id = p_link_id
  for update;

  if not found then
    raise exception 'Guardian link not found' using errcode = 'P0002';
  end if;
  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage guardians' using errcode = '42501';
  end if;
  if (v_old->>'status') = 'revoked' then
    return;
  end if;

  select m.role into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_student_guardians
  set status = 'revoked',
      is_primary = false
  where id = p_link_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.student_guardian.unlinked',
    'school_student_guardian',
    p_link_id,
    jsonb_build_object('before', v_old, 'after_status', 'revoked'),
    'success',
    v_role,
    v_school_id
  );
end;
$$;

revoke all on function public.unlink_school_student_guardian(uuid)
  from public, anon;
grant execute on function public.unlink_school_student_guardian(uuid)
  to authenticated;
