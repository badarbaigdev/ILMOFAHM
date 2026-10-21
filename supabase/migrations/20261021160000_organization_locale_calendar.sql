-- ILM-ORG-003: Locale, timezone, working days, and holiday placeholders
--
-- Extends organizations with working_days. Managers update locale settings via
-- SECURITY DEFINER RPC with audit. organization_holidays holds named dates for
-- later academic calendar / attendance modules (CRUD only; no term model yet).

-- ---------------------------------------------------------------------------
-- organizations.working_days (ISO weekdays 1=Mon … 7=Sun)
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists working_days smallint[] not null default array[1, 2, 3, 4, 5]::smallint[];

alter table public.organizations
  drop constraint if exists organizations_working_days_valid;

alter table public.organizations
  add constraint organizations_working_days_valid check (
    cardinality(working_days) between 1 and 7
    and working_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  );

alter table public.organizations
  drop constraint if exists organizations_timezone_not_blank;

alter table public.organizations
  add constraint organizations_timezone_not_blank check (
    length(trim(timezone)) > 0
  );

alter table public.organizations
  drop constraint if exists organizations_locale_not_blank;

alter table public.organizations
  add constraint organizations_locale_not_blank check (
    length(trim(locale)) > 0
  );

comment on column public.organizations.working_days is
  'ISO weekdays (1=Monday … 7=Sunday) treated as working days for this tenant.';
comment on column public.organizations.timezone is
  'IANA timezone id used for local calendar and reporting (e.g. Asia/Karachi).';
comment on column public.organizations.locale is
  'Default UI/content locale code (en, ur). Not a substitute for membership auth.';

-- ---------------------------------------------------------------------------
-- organization_holidays (placeholder calendar dates)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id)
    on delete restrict,
  name text not null,
  holiday_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_holidays_name_not_blank check (
    length(trim(name)) > 0
  ),
  constraint organization_holidays_org_date_unique unique (
    organization_id,
    holiday_date
  )
);

comment on table public.organization_holidays is
  'Named holiday dates for an organization. Foundation for attendance/calendar; not full academic-year rollover.';

create index if not exists organization_holidays_organization_id_idx
  on public.organization_holidays (organization_id);

create index if not exists organization_holidays_org_date_idx
  on public.organization_holidays (organization_id, holiday_date);

drop trigger if exists organization_holidays_set_updated_at
  on public.organization_holidays;

create trigger organization_holidays_set_updated_at
before update on public.organization_holidays
for each row
execute function public.set_updated_at();

drop trigger if exists organization_holidays_reject_organization_id_change
  on public.organization_holidays;

create trigger organization_holidays_reject_organization_id_change
before update on public.organization_holidays
for each row
execute function public.reject_organization_id_change();

alter table public.organization_holidays enable row level security;
alter table public.organization_holidays force row level security;

revoke all on table public.organization_holidays from anon, authenticated;
grant select on table public.organization_holidays to authenticated;
-- Writes go through SECURITY DEFINER RPCs only.
revoke insert, update, delete on table public.organization_holidays from authenticated;

drop policy if exists organization_holidays_select_member
  on public.organization_holidays;

create policy organization_holidays_select_member
on public.organization_holidays
for select
to authenticated
using (public.is_active_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Allowed timezone / locale helpers (curated allowlists)
-- ---------------------------------------------------------------------------

create or replace function public.is_allowed_organization_timezone(p_timezone text)
returns boolean
language sql
immutable
as $$
  select nullif(trim(p_timezone), '') in (
    'Asia/Karachi',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Dhaka',
    'Asia/Riyadh',
    'UTC',
    'Europe/London'
  );
$$;

create or replace function public.is_allowed_organization_locale(p_locale text)
returns boolean
language sql
immutable
as $$
  select nullif(trim(p_locale), '') in ('en', 'ur');
$$;

-- ---------------------------------------------------------------------------
-- update_organization_locale_settings
-- ---------------------------------------------------------------------------

create or replace function public.update_organization_locale_settings(
  p_organization_id uuid,
  p_timezone text,
  p_locale text,
  p_working_days smallint[]
)
returns table (
  organization_id uuid,
  timezone text,
  locale text,
  working_days smallint[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_timezone text := nullif(trim(p_timezone), '');
  v_locale text := nullif(trim(p_locale), '');
  v_days smallint[];
  v_old jsonb;
  v_new_timezone text;
  v_new_locale text;
  v_new_days smallint[];
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id is required'
      using errcode = '22023';
  end if;

  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to update locale settings for this organization'
      using errcode = '42501';
  end if;

  if v_timezone is null or not public.is_allowed_organization_timezone(v_timezone) then
    raise exception 'Invalid or unsupported timezone'
      using errcode = '22023';
  end if;

  if v_locale is null or not public.is_allowed_organization_locale(v_locale) then
    raise exception 'Invalid or unsupported locale'
      using errcode = '22023';
  end if;

  if p_working_days is null or cardinality(p_working_days) < 1 then
    raise exception 'At least one working day is required'
      using errcode = '22023';
  end if;

  -- Normalize: unique, sorted, valid ISO weekdays only.
  select array_agg(d order by d)
  into v_days
  from (
    select distinct unnest(p_working_days) as d
  ) as s
  where d between 1 and 7;

  if v_days is null or cardinality(v_days) < 1 then
    raise exception 'Working days must be ISO weekdays 1–7'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select jsonb_build_object(
           'timezone', o.timezone,
           'locale', o.locale,
           'working_days', to_jsonb(o.working_days)
         )
  into v_old
  from public.organizations as o
  where o.id = p_organization_id
  for update;

  if not found then
    raise exception 'Organization not found'
      using errcode = 'P0002';
  end if;

  update public.organizations as o
  set
    timezone = v_timezone,
    locale = v_locale,
    working_days = v_days
  where o.id = p_organization_id;

  select o.timezone, o.locale, o.working_days
  into strict v_new_timezone, v_new_locale, v_new_days
  from public.organizations as o
  where o.id = p_organization_id;

  if v_old is distinct from jsonb_build_object(
       'timezone', v_new_timezone,
       'locale', v_new_locale,
       'working_days', to_jsonb(v_new_days)
     ) then
    perform public.write_audit_event(
      p_organization_id,
      v_user_id,
      'organization.locale_settings_updated',
      'organization',
      p_organization_id,
      jsonb_build_object(
        'before', v_old,
        'after', jsonb_build_object(
          'timezone', v_new_timezone,
          'locale', v_new_locale,
          'working_days', to_jsonb(v_new_days)
        )
      ),
      'success',
      v_role
    );
  end if;

  organization_id := p_organization_id;
  timezone := v_new_timezone;
  locale := v_new_locale;
  working_days := v_new_days;
  return next;
end;
$$;

comment on function public.update_organization_locale_settings(
  uuid, text, text, smallint[]
) is
  'Owner/admin updates timezone, locale, and working days. Audited. Uses curated allowlists.';

revoke all on function public.update_organization_locale_settings(
  uuid, text, text, smallint[]
) from public, anon;

grant execute on function public.update_organization_locale_settings(
  uuid, text, text, smallint[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- Holiday RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_holiday(
  p_organization_id uuid,
  p_name text,
  p_holiday_date date
)
returns table (
  holiday_id uuid,
  organization_id uuid,
  name text,
  holiday_date date
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
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'organization_id is required'
      using errcode = '22023';
  end if;

  if not public.is_org_manager(p_organization_id) then
    raise exception 'Not authorized to manage holidays for this organization'
      using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Holiday name is required'
      using errcode = '22023';
  end if;

  if p_holiday_date is null then
    raise exception 'Holiday date is required'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.organization_holidays (
    organization_id,
    name,
    holiday_date
  )
  values (
    p_organization_id,
    v_name,
    p_holiday_date
  )
  returning id
  into v_id;

  perform public.write_audit_event(
    p_organization_id,
    v_user_id,
    'organization.holiday_created',
    'organization_holiday',
    v_id,
    jsonb_build_object(
      'name', v_name,
      'holiday_date', p_holiday_date
    ),
    'success',
    v_role
  );

  holiday_id := v_id;
  organization_id := p_organization_id;
  name := v_name;
  holiday_date := p_holiday_date;
  return next;
end;
$$;

comment on function public.create_organization_holiday(uuid, text, date) is
  'Owner/admin adds a named holiday date. Unique per organization+date.';

revoke all on function public.create_organization_holiday(uuid, text, date)
  from public, anon;

grant execute on function public.create_organization_holiday(uuid, text, date)
  to authenticated;

create or replace function public.delete_organization_holiday(
  p_holiday_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_org_id uuid;
  v_name text;
  v_date date;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_holiday_id is null then
    raise exception 'holiday_id is required'
      using errcode = '22023';
  end if;

  select h.organization_id, h.name, h.holiday_date
  into v_org_id, v_name, v_date
  from public.organization_holidays as h
  where h.id = p_holiday_id
  for update;

  if not found then
    raise exception 'Holiday not found'
      using errcode = 'P0002';
  end if;

  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to manage holidays for this organization'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  delete from public.organization_holidays
  where id = p_holiday_id;

  perform public.write_audit_event(
    v_org_id,
    v_user_id,
    'organization.holiday_deleted',
    'organization_holiday',
    p_holiday_id,
    jsonb_build_object(
      'name', v_name,
      'holiday_date', v_date
    ),
    'success',
    v_role
  );

  return p_holiday_id;
end;
$$;

comment on function public.delete_organization_holiday(uuid) is
  'Owner/admin deletes a holiday. Audited.';

revoke all on function public.delete_organization_holiday(uuid)
  from public, anon;

grant execute on function public.delete_organization_holiday(uuid)
  to authenticated;
