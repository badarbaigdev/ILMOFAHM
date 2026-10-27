-- Controlled school-admin password recovery (platform-mediated; not self-service).

create table if not exists public.school_password_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  membership_id uuid
    references public.school_memberships (id)
    on delete set null,
  requester_user_id uuid
    references auth.users (id)
    on delete set null,
  requester_email text not null,
  requester_role text,
  reason text not null,
  status text not null default 'pending',
  reviewed_by uuid
    references auth.users (id)
    on delete set null,
  reviewed_at timestamptz,
  review_note text,
  recovery_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_password_recovery_requests_email_format check (
    requester_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint school_password_recovery_requests_reason_length check (
    length(trim(reason)) >= 8 and length(reason) <= 500
  ),
  constraint school_password_recovery_requests_status_valid check (
    status in (
      'pending',
      'approved',
      'denied',
      'fulfilled',
      'cancelled',
      'expired'
    )
  ),
  constraint school_password_recovery_requests_review_note_length check (
    review_note is null or length(review_note) <= 500
  ),
  constraint school_password_recovery_requests_role_valid check (
    requester_role is null
    or requester_role in ('owner', 'admin', 'teacher', 'accountant', 'staff')
  )
);

comment on table public.school_password_recovery_requests is
  'School admin password recovery requests reviewed by platform operators. Self-service Auth reset is not the school-admin path.';

create index if not exists school_password_recovery_requests_status_idx
  on public.school_password_recovery_requests (status, created_at desc);
create index if not exists school_password_recovery_requests_school_id_idx
  on public.school_password_recovery_requests (school_id);
create index if not exists school_password_recovery_requests_email_idx
  on public.school_password_recovery_requests (requester_email);

drop trigger if exists school_password_recovery_requests_set_updated_at
  on public.school_password_recovery_requests;
create trigger school_password_recovery_requests_set_updated_at
before update on public.school_password_recovery_requests
for each row
execute function public.set_updated_at();

drop trigger if exists school_password_recovery_requests_reject_school_id_change
  on public.school_password_recovery_requests;
create trigger school_password_recovery_requests_reject_school_id_change
before update on public.school_password_recovery_requests
for each row
execute function public.reject_school_id_change();

alter table public.school_password_recovery_requests enable row level security;
alter table public.school_password_recovery_requests force row level security;
revoke all on table public.school_password_recovery_requests
  from anon, authenticated;
grant select on table public.school_password_recovery_requests to authenticated;

drop policy if exists school_password_recovery_requests_select_operator
  on public.school_password_recovery_requests;
create policy school_password_recovery_requests_select_operator
on public.school_password_recovery_requests
for select
to authenticated
using (public.is_platform_operator());

-- Inserts/updates go through security definer RPCs only (service role / operators).

create or replace function public.create_school_password_recovery_request(
  p_school_id uuid,
  p_membership_id uuid,
  p_requester_user_id uuid,
  p_requester_email text,
  p_requester_role text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_requester_email, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_role text := nullif(trim(coalesce(p_requester_role, '')), '');
  v_id uuid;
begin
  -- Callable only with service_role (app server) — not end-user clients.
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_school_id is null or p_membership_id is null or p_requester_user_id is null then
    raise exception 'School membership is required' using errcode = '22023';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid email is required' using errcode = '22023';
  end if;
  if length(v_reason) < 8 or length(v_reason) > 500 then
    raise exception 'Enter a recovery reason (8–500 characters)'
      using errcode = '22023';
  end if;
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'Only school owners and admins may request controlled recovery'
      using errcode = '22023';
  end if;

  -- Collapse duplicate open requests for the same membership.
  update public.school_password_recovery_requests as r
  set status = 'cancelled',
      updated_at = now(),
      review_note = coalesce(r.review_note, 'Superseded by a newer request')
  where r.membership_id = p_membership_id
    and r.status = 'pending';

  insert into public.school_password_recovery_requests (
    school_id,
    membership_id,
    requester_user_id,
    requester_email,
    requester_role,
    reason,
    status
  )
  values (
    p_school_id,
    p_membership_id,
    p_requester_user_id,
    v_email,
    v_role,
    v_reason,
    'pending'
  )
  returning id into v_id;

  perform public.write_audit_event(
    null,
    p_requester_user_id,
    'school.password_recovery.requested',
    'school_password_recovery_request',
    v_id,
    jsonb_build_object(
      'school_id', p_school_id,
      'role', v_role
    ),
    'success',
    v_role,
    p_school_id
  );

  return v_id;
end;
$$;

revoke all on function public.create_school_password_recovery_request(
  uuid, uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_school_password_recovery_request(
  uuid, uuid, uuid, text, text, text
) to service_role;

create or replace function public.review_school_password_recovery_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_note text := nullif(trim(coalesce(p_review_note, '')), '');
  v_row public.school_password_recovery_requests%rowtype;
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Only platform operators can review recovery requests'
      using errcode = '42501';
  end if;
  if v_decision not in ('approve', 'deny') then
    raise exception 'Decision must be approve or deny' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 500 then
    raise exception 'Review note must be 500 characters or fewer'
      using errcode = '22023';
  end if;

  select * into v_row
  from public.school_password_recovery_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Recovery request not found' using errcode = 'P0002';
  end if;
  if v_row.status is distinct from 'pending' then
    raise exception 'Only pending requests can be reviewed'
      using errcode = '22023';
  end if;

  v_new_status := case when v_decision = 'approve' then 'approved' else 'denied' end;

  update public.school_password_recovery_requests
  set status = v_new_status,
      reviewed_by = v_user_id,
      reviewed_at = now(),
      review_note = v_note,
      updated_at = now()
  where id = p_request_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    case
      when v_decision = 'approve' then 'school.password_recovery.approved'
      else 'school.password_recovery.denied'
    end,
    'school_password_recovery_request',
    p_request_id,
    jsonb_build_object(
      'school_id', v_row.school_id,
      'decision', v_decision
    ),
    'success',
    'platform_operator',
    v_row.school_id
  );
end;
$$;

revoke all on function public.review_school_password_recovery_request(uuid, text, text)
  from public, anon;
grant execute on function public.review_school_password_recovery_request(uuid, text, text)
  to authenticated;

create or replace function public.mark_school_password_recovery_fulfilled(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_row public.school_password_recovery_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_platform_operator() then
    raise exception 'Only platform operators can fulfill recovery requests'
      using errcode = '42501';
  end if;

  select * into v_row
  from public.school_password_recovery_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Recovery request not found' using errcode = 'P0002';
  end if;
  if v_row.status not in ('approved', 'pending') then
    raise exception 'Request cannot be fulfilled in its current status'
      using errcode = '22023';
  end if;

  update public.school_password_recovery_requests
  set status = 'fulfilled',
      reviewed_by = coalesce(reviewed_by, v_user_id),
      reviewed_at = coalesce(reviewed_at, now()),
      recovery_issued_at = now(),
      updated_at = now()
  where id = p_request_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.password_recovery.link_issued',
    'school_password_recovery_request',
    p_request_id,
    jsonb_build_object('school_id', v_row.school_id),
    'success',
    'platform_operator',
    v_row.school_id
  );
end;
$$;

revoke all on function public.mark_school_password_recovery_fulfilled(uuid)
  from public, anon;
grant execute on function public.mark_school_password_recovery_fulfilled(uuid)
  to authenticated;
