-- Phase 8: School setup (profile, branding, locale/calendar, campuses, complete)
--
-- Extends school tenant tables for owner/admin setup after invitation accept.
-- Lifecycle status / setup_completed_at are protected; only complete_school_setup
-- (or platform operator with bypass) may activate a school.

-- ---------------------------------------------------------------------------
-- schools: branding, website, working days
-- ---------------------------------------------------------------------------

alter table public.schools
  add column if not exists website_url text,
  add column if not exists brand_display_name text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_logo_url text,
  add column if not exists working_days smallint[] not null
    default array[1, 2, 3, 4, 5]::smallint[];

alter table public.schools
  drop constraint if exists schools_website_url_format,
  drop constraint if exists schools_brand_display_name_not_blank,
  drop constraint if exists schools_brand_primary_color_format,
  drop constraint if exists schools_brand_logo_url_format,
  drop constraint if exists schools_working_days_valid;

alter table public.schools
  add constraint schools_website_url_format check (
    website_url is null
    or website_url ~* '^https?://[^\s]+$'
  ),
  add constraint schools_brand_display_name_not_blank check (
    brand_display_name is null or length(trim(brand_display_name)) > 0
  ),
  add constraint schools_brand_primary_color_format check (
    brand_primary_color is null
    or brand_primary_color ~* '^#[0-9a-fA-F]{6}$'
  ),
  add constraint schools_brand_logo_url_format check (
    brand_logo_url is null
    or brand_logo_url ~* '^https://[^\s]+$'
  ),
  add constraint schools_working_days_valid check (
    cardinality(working_days) between 1 and 7
    and working_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  );

comment on column public.schools.website_url is
  'Optional public website URL (http or https).';
comment on column public.schools.brand_display_name is
  'Optional public-facing brand name; falls back to schools.name when null.';
comment on column public.schools.brand_primary_color is
  'Optional brand accent as #RRGGBB.';
comment on column public.schools.brand_logo_url is
  'Optional https logo URL. Private Storage uploads are a later milestone.';
comment on column public.schools.working_days is
  'ISO weekdays (1=Monday … 7=Sunday) treated as working days for this school.';

-- ---------------------------------------------------------------------------
-- school_campuses: contact + code + branding overrides
-- ---------------------------------------------------------------------------

alter table public.school_campuses
  add column if not exists code text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists brand_display_name text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_logo_url text;

alter table public.school_campuses
  drop constraint if exists school_campuses_phone_not_blank,
  drop constraint if exists school_campuses_email_format,
  drop constraint if exists school_campuses_address_not_blank,
  drop constraint if exists school_campuses_brand_display_name_not_blank,
  drop constraint if exists school_campuses_brand_primary_color_format,
  drop constraint if exists school_campuses_brand_logo_url_format;

alter table public.school_campuses
  add constraint school_campuses_phone_not_blank check (
    phone is null or length(trim(phone)) > 0
  ),
  add constraint school_campuses_email_format check (
    email is null
    or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  add constraint school_campuses_address_not_blank check (
    address_line1 is null or length(trim(address_line1)) > 0
  ),
  add constraint school_campuses_brand_display_name_not_blank check (
    brand_display_name is null or length(trim(brand_display_name)) > 0
  ),
  add constraint school_campuses_brand_primary_color_format check (
    brand_primary_color is null
    or brand_primary_color ~* '^#[0-9a-fA-F]{6}$'
  ),
  add constraint school_campuses_brand_logo_url_format check (
    brand_logo_url is null
    or brand_logo_url ~* '^https://[^\s]+$'
  );

comment on column public.school_campuses.code is
  'Optional short campus code for staff display.';
comment on column public.school_campuses.phone is
  'Optional campus contact phone (display only).';
comment on column public.school_campuses.email is
  'Optional campus contact email (display only).';

-- ---------------------------------------------------------------------------
-- school_holidays
-- ---------------------------------------------------------------------------

create table if not exists public.school_holidays (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null
    references public.schools (id)
    on delete restrict,
  name text not null,
  holiday_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_holidays_name_not_blank check (length(trim(name)) > 0),
  constraint school_holidays_school_date_unique unique (school_id, holiday_date)
);

comment on table public.school_holidays is
  'Named holiday dates for a school. Foundation for attendance/calendar.';

create index if not exists school_holidays_school_id_idx
  on public.school_holidays (school_id);

create index if not exists school_holidays_school_date_idx
  on public.school_holidays (school_id, holiday_date);

drop trigger if exists school_holidays_set_updated_at on public.school_holidays;
create trigger school_holidays_set_updated_at
before update on public.school_holidays
for each row
execute function public.set_updated_at();

drop trigger if exists school_holidays_reject_school_id_change
  on public.school_holidays;
create trigger school_holidays_reject_school_id_change
before update on public.school_holidays
for each row
execute function public.reject_school_id_change();

alter table public.school_holidays enable row level security;
alter table public.school_holidays force row level security;

revoke all on table public.school_holidays from anon, authenticated;
grant select on table public.school_holidays to authenticated;

drop policy if exists school_holidays_select_member on public.school_holidays;
create policy school_holidays_select_member
on public.school_holidays
for select
to authenticated
using (
  public.is_active_school_member(school_id)
  or public.is_platform_operator()
);

-- Setup mutations go through SECURITY DEFINER RPCs only.
revoke update on table public.schools from authenticated;
revoke insert, update on table public.school_campuses from authenticated;

drop policy if exists schools_update_manager on public.schools;
drop policy if exists school_campuses_insert_manager_or_operator
  on public.school_campuses;
drop policy if exists school_campuses_update_manager_or_operator
  on public.school_campuses;

-- ---------------------------------------------------------------------------
-- Protect school lifecycle columns (status, setup_completed_at, slug, id)
-- ---------------------------------------------------------------------------

create or replace function public.protect_school_lifecycle_columns()
returns trigger
language plpgsql
as $$
declare
  v_bypass boolean := coalesce(
    nullif(current_setting('ilmofahm.bypass_school_lifecycle', true), ''),
    ''
  ) = '1';
begin
  if new.id is distinct from old.id then
    raise exception 'schools.id cannot be changed'
      using errcode = 'check_violation';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'schools.created_at cannot be changed'
      using errcode = 'check_violation';
  end if;

  if new.slug is distinct from old.slug and not v_bypass then
    raise exception 'schools.slug cannot be changed via Data API'
      using errcode = 'check_violation';
  end if;

  if new.setup_completed_at is distinct from old.setup_completed_at
     and not v_bypass then
    raise exception 'schools.setup_completed_at cannot be changed via Data API'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status and not v_bypass then
    -- Provisioning RPC may advance provisioning → pending_setup without bypass.
    if not (
      old.status = 'provisioning'
      and new.status = 'pending_setup'
    ) then
      raise exception 'schools.status cannot be changed via Data API'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.protect_school_lifecycle_columns() is
  'Rejects client updates that change school id, status, setup_completed_at, slug, or created_at. Bypass via ilmofahm.bypass_school_lifecycle=1 for complete_school_setup.';

drop trigger if exists schools_protect_lifecycle on public.schools;
create trigger schools_protect_lifecycle
before update on public.schools
for each row
execute function public.protect_school_lifecycle_columns();

-- Reuse curated allowlists from org locale migration where present.
create or replace function public.is_allowed_school_timezone(p_timezone text)
returns boolean
language sql
immutable
as $$
  select public.is_allowed_organization_timezone(p_timezone);
$$;

create or replace function public.is_allowed_school_locale(p_locale text)
returns boolean
language sql
immutable
as $$
  select public.is_allowed_organization_locale(p_locale);
$$;

-- ---------------------------------------------------------------------------
-- update_school_profile
-- ---------------------------------------------------------------------------

create or replace function public.update_school_profile(
  p_school_id uuid,
  p_name text,
  p_institution_type text,
  p_email text default null,
  p_phone text default null,
  p_address_line1 text default null,
  p_city text default null,
  p_region text default null,
  p_country_code text default null
)
returns table (
  school_id uuid,
  name text,
  institution_type text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_type text := nullif(trim(p_institution_type), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_address text := nullif(trim(p_address_line1), '');
  v_city text := nullif(trim(p_city), '');
  v_region text := nullif(trim(p_region), '');
  v_country text := upper(nullif(trim(p_country_code), ''));
  v_old jsonb;
  v_new_name text;
  v_new_type text;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to update this school'
      using errcode = '42501';
  end if;

  if v_name is null or length(v_name) < 2 then
    raise exception 'School name must be at least 2 characters'
      using errcode = '22023';
  end if;

  if v_type is null or v_type not in ('school', 'academy', 'both') then
    raise exception 'Invalid institution_type'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid school email is required when provided'
      using errcode = '22023';
  end if;

  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    raise exception 'Country code must be a 2-letter ISO code'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select jsonb_build_object(
           'name', s.name,
           'institution_type', s.institution_type,
           'email', s.email,
           'phone', s.phone,
           'address_line1', s.address_line1,
           'city', s.city,
           'region', s.region,
           'country_code', s.country_code
         )
  into v_old
  from public.schools as s
  where s.id = p_school_id
  for update;

  if not found then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  update public.schools as s
  set
    name = v_name,
    institution_type = v_type,
    email = v_email,
    phone = v_phone,
    address_line1 = v_address,
    city = v_city,
    region = v_region,
    country_code = coalesce(v_country, s.country_code)
  where s.id = p_school_id
  returning s.name, s.institution_type, s.updated_at
  into v_new_name, v_new_type, v_updated_at;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.profile_updated',
    'school',
    p_school_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_new_name,
        'institution_type', v_new_type,
        'email', v_email,
        'phone', v_phone,
        'address_line1', v_address,
        'city', v_city,
        'region', v_region,
        'country_code', coalesce(v_country, v_old ->> 'country_code')
      )
    ),
    'success',
    v_role,
    p_school_id
  );

  school_id := p_school_id;
  name := v_new_name;
  institution_type := v_new_type;
  updated_at := v_updated_at;
  return next;
end;
$$;

revoke all on function public.update_school_profile(
  uuid, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.update_school_profile(
  uuid, text, text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_branding
-- ---------------------------------------------------------------------------

create or replace function public.update_school_branding(
  p_school_id uuid,
  p_website_url text default null,
  p_brand_display_name text default null,
  p_brand_primary_color text default null,
  p_brand_logo_url text default null
)
returns table (
  school_id uuid,
  website_url text,
  brand_display_name text,
  brand_primary_color text,
  brand_logo_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_website text := nullif(trim(p_website_url), '');
  v_display text := nullif(trim(p_brand_display_name), '');
  v_color text := nullif(trim(p_brand_primary_color), '');
  v_logo text := nullif(trim(p_brand_logo_url), '');
  v_old jsonb;
  v_new_website text;
  v_new_display text;
  v_new_color text;
  v_new_logo text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to update branding for this school'
      using errcode = '42501';
  end if;

  if v_website is not null and v_website !~* '^https?://[^\s]+$' then
    raise exception 'Website URL must start with http:// or https://'
      using errcode = '22023';
  end if;

  if v_color is not null and v_color !~* '^#[0-9a-fA-F]{6}$' then
    raise exception 'Brand color must be a #RRGGBB hex value'
      using errcode = '22023';
  end if;

  if v_logo is not null and v_logo !~* '^https://[^\s]+$' then
    raise exception 'Logo URL must be an https URL'
      using errcode = '22023';
  end if;

  if v_color is not null then
    v_color := upper(v_color);
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select jsonb_build_object(
           'website_url', s.website_url,
           'brand_display_name', s.brand_display_name,
           'brand_primary_color', s.brand_primary_color,
           'brand_logo_url', s.brand_logo_url
         )
  into v_old
  from public.schools as s
  where s.id = p_school_id
  for update;

  if not found then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  update public.schools as s
  set
    website_url = v_website,
    brand_display_name = v_display,
    brand_primary_color = v_color,
    brand_logo_url = v_logo
  where s.id = p_school_id;

  select s.website_url, s.brand_display_name, s.brand_primary_color, s.brand_logo_url
  into strict v_new_website, v_new_display, v_new_color, v_new_logo
  from public.schools as s
  where s.id = p_school_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.branding_updated',
    'school',
    p_school_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'website_url', v_new_website,
        'brand_display_name', v_new_display,
        'brand_primary_color', v_new_color,
        'brand_logo_url', v_new_logo
      )
    ),
    'success',
    v_role,
    p_school_id
  );

  school_id := p_school_id;
  website_url := v_new_website;
  brand_display_name := v_new_display;
  brand_primary_color := v_new_color;
  brand_logo_url := v_new_logo;
  return next;
end;
$$;

revoke all on function public.update_school_branding(
  uuid, text, text, text, text
) from public, anon;
grant execute on function public.update_school_branding(
  uuid, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_school_locale_settings
-- ---------------------------------------------------------------------------

create or replace function public.update_school_locale_settings(
  p_school_id uuid,
  p_timezone text,
  p_default_locale text,
  p_working_days smallint[]
)
returns table (
  school_id uuid,
  timezone text,
  default_locale text,
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
  v_locale text := nullif(trim(p_default_locale), '');
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

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to update locale settings for this school'
      using errcode = '42501';
  end if;

  if v_timezone is null or not public.is_allowed_school_timezone(v_timezone) then
    raise exception 'Invalid or unsupported timezone'
      using errcode = '22023';
  end if;

  if v_locale is null or not public.is_allowed_school_locale(v_locale) then
    raise exception 'Invalid or unsupported locale'
      using errcode = '22023';
  end if;

  if p_working_days is null or cardinality(p_working_days) < 1 then
    raise exception 'At least one working day is required'
      using errcode = '22023';
  end if;

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
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select jsonb_build_object(
           'timezone', s.timezone,
           'default_locale', s.default_locale,
           'working_days', to_jsonb(s.working_days)
         )
  into v_old
  from public.schools as s
  where s.id = p_school_id
  for update;

  if not found then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  update public.schools as s
  set
    timezone = v_timezone,
    default_locale = v_locale,
    working_days = v_days
  where s.id = p_school_id;

  select s.timezone, s.default_locale, s.working_days
  into strict v_new_timezone, v_new_locale, v_new_days
  from public.schools as s
  where s.id = p_school_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.locale_settings_updated',
    'school',
    p_school_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'timezone', v_new_timezone,
        'default_locale', v_new_locale,
        'working_days', to_jsonb(v_new_days)
      )
    ),
    'success',
    v_role,
    p_school_id
  );

  school_id := p_school_id;
  timezone := v_new_timezone;
  default_locale := v_new_locale;
  working_days := v_new_days;
  return next;
end;
$$;

revoke all on function public.update_school_locale_settings(
  uuid, text, text, smallint[]
) from public, anon;
grant execute on function public.update_school_locale_settings(
  uuid, text, text, smallint[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- Holiday RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_school_holiday(
  p_school_id uuid,
  p_name text,
  p_holiday_date date
)
returns table (
  holiday_id uuid,
  school_id uuid,
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

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage holidays for this school'
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
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_holidays (school_id, name, holiday_date)
  values (p_school_id, v_name, p_holiday_date)
  returning id into v_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.holiday_created',
    'school_holiday',
    v_id,
    jsonb_build_object('name', v_name, 'holiday_date', p_holiday_date),
    'success',
    v_role,
    p_school_id
  );

  holiday_id := v_id;
  school_id := p_school_id;
  name := v_name;
  holiday_date := p_holiday_date;
  return next;
end;
$$;

revoke all on function public.create_school_holiday(uuid, text, date)
  from public, anon;
grant execute on function public.create_school_holiday(uuid, text, date)
  to authenticated;

create or replace function public.delete_school_holiday(p_holiday_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school_id uuid;
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

  select h.school_id, h.name, h.holiday_date
  into v_school_id, v_name, v_date
  from public.school_holidays as h
  where h.id = p_holiday_id
  for update;

  if not found then
    raise exception 'Holiday not found'
      using errcode = 'P0002';
  end if;

  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage holidays for this school'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  delete from public.school_holidays where id = p_holiday_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.holiday_deleted',
    'school_holiday',
    p_holiday_id,
    jsonb_build_object('name', v_name, 'holiday_date', v_date),
    'success',
    v_role,
    v_school_id
  );

  return p_holiday_id;
end;
$$;

revoke all on function public.delete_school_holiday(uuid) from public, anon;
grant execute on function public.delete_school_holiday(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Campus RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_school_campus(
  p_school_id uuid,
  p_name text,
  p_code text default null,
  p_phone text default null,
  p_email text default null,
  p_address_line1 text default null,
  p_city text default null
)
returns table (
  campus_id uuid,
  school_id uuid,
  name text,
  code text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_phone text := nullif(trim(p_phone), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_address text := nullif(trim(p_address_line1), '');
  v_city text := nullif(trim(p_city), '');
  v_campus_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to manage campuses in this school'
      using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Campus name is required'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid campus email is required when provided'
      using errcode = '22023';
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  insert into public.school_campuses (
    school_id, name, code, phone, email, address_line1, city, status
  )
  values (
    p_school_id, v_name, v_code, v_phone, v_email, v_address, v_city, 'active'
  )
  returning id into v_campus_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.campus_created',
    'school_campus',
    v_campus_id,
    jsonb_build_object('name', v_name, 'code', v_code, 'status', 'active'),
    'success',
    v_role,
    p_school_id
  );

  campus_id := v_campus_id;
  school_id := p_school_id;
  name := v_name;
  code := v_code;
  status := 'active';
  return next;
end;
$$;

revoke all on function public.create_school_campus(
  uuid, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_school_campus(
  uuid, text, text, text, text, text, text
) to authenticated;

create or replace function public.update_school_campus(
  p_campus_id uuid,
  p_name text,
  p_code text default null,
  p_phone text default null,
  p_email text default null,
  p_address_line1 text default null,
  p_city text default null,
  p_status text default null
)
returns table (
  campus_id uuid,
  school_id uuid,
  name text,
  code text,
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
  v_name text := nullif(trim(p_name), '');
  v_code text := nullif(trim(p_code), '');
  v_phone text := nullif(trim(p_phone), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_address text := nullif(trim(p_address_line1), '');
  v_city text := nullif(trim(p_city), '');
  v_status text := nullif(trim(p_status), '');
  v_old jsonb;
  v_new_name text;
  v_new_code text;
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_campus_id is null then
    raise exception 'campus_id is required'
      using errcode = '22023';
  end if;

  if v_name is null then
    raise exception 'Campus name is required'
      using errcode = '22023';
  end if;

  if v_status is not null and v_status not in ('active', 'archived') then
    raise exception 'Invalid campus status'
      using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid campus email is required when provided'
      using errcode = '22023';
  end if;

  select c.school_id,
         jsonb_build_object(
           'name', c.name,
           'code', c.code,
           'phone', c.phone,
           'email', c.email,
           'address_line1', c.address_line1,
           'city', c.city,
           'status', c.status
         )
  into v_school_id, v_old
  from public.school_campuses as c
  where c.id = p_campus_id
  for update;

  if not found then
    raise exception 'Campus not found'
      using errcode = 'P0002';
  end if;

  if not public.is_school_manager(v_school_id) then
    raise exception 'Not authorized to manage campuses in this school'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = v_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.school_campuses as c
  set
    name = v_name,
    code = v_code,
    phone = v_phone,
    email = v_email,
    address_line1 = v_address,
    city = v_city,
    status = coalesce(v_status, c.status)
  where c.id = p_campus_id;

  select c.name, c.code, c.status
  into strict v_new_name, v_new_code, v_new_status
  from public.school_campuses as c
  where c.id = p_campus_id;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.campus_updated',
    'school_campus',
    p_campus_id,
    jsonb_build_object(
      'before', v_old,
      'after', jsonb_build_object(
        'name', v_new_name,
        'code', v_new_code,
        'phone', v_phone,
        'email', v_email,
        'address_line1', v_address,
        'city', v_city,
        'status', v_new_status
      )
    ),
    'success',
    v_role,
    v_school_id
  );

  campus_id := p_campus_id;
  school_id := v_school_id;
  name := v_new_name;
  code := v_new_code;
  status := v_new_status;
  return next;
end;
$$;

revoke all on function public.update_school_campus(
  uuid, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.update_school_campus(
  uuid, text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- complete_school_setup
-- ---------------------------------------------------------------------------

create or replace function public.complete_school_setup(p_school_id uuid)
returns table (
  school_id uuid,
  status text,
  setup_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text;
  v_school public.schools%rowtype;
  v_active_campuses int;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id is required'
      using errcode = '22023';
  end if;

  if not public.is_school_manager(p_school_id) then
    raise exception 'Not authorized to complete setup for this school'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.school_memberships as m
  where m.school_id = p_school_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select *
  into v_school
  from public.schools as s
  where s.id = p_school_id
  for update;

  if not found then
    raise exception 'School not found'
      using errcode = 'P0002';
  end if;

  -- Idempotent: already active with setup timestamp.
  if v_school.status = 'active' and v_school.setup_completed_at is not null then
    school_id := v_school.id;
    status := v_school.status;
    setup_completed_at := v_school.setup_completed_at;
    return next;
    return;
  end if;

  if v_school.status not in ('pending_setup', 'active') then
    raise exception 'School cannot complete setup from status %', v_school.status
      using errcode = '22023';
  end if;

  if length(trim(v_school.name)) < 2 then
    raise exception 'School profile name is required before completing setup'
      using errcode = '22023';
  end if;

  if v_school.institution_type is null
     or v_school.institution_type not in ('school', 'academy', 'both') then
    raise exception 'Institution type is required before completing setup'
      using errcode = '22023';
  end if;

  if not public.is_allowed_school_timezone(v_school.timezone) then
    raise exception 'Valid timezone is required before completing setup'
      using errcode = '22023';
  end if;

  if not public.is_allowed_school_locale(v_school.default_locale) then
    raise exception 'Valid locale is required before completing setup'
      using errcode = '22023';
  end if;

  select count(*)::int
  into v_active_campuses
  from public.school_campuses as c
  where c.school_id = p_school_id
    and c.status = 'active';

  if v_active_campuses < 1 then
    raise exception 'At least one active campus is required before completing setup'
      using errcode = '22023';
  end if;

  perform set_config('ilmofahm.bypass_school_lifecycle', '1', true);

  update public.schools as s
  set
    status = 'active',
    setup_completed_at = coalesce(s.setup_completed_at, now())
  where s.id = p_school_id
  returning s.setup_completed_at into v_completed_at;

  perform public.write_audit_event(
    null,
    v_user_id,
    'school.setup.completed',
    'school',
    p_school_id,
    jsonb_build_object(
      'previous_status', v_school.status,
      'active_campuses', v_active_campuses
    ),
    'success',
    v_role,
    p_school_id
  );

  school_id := p_school_id;
  status := 'active';
  setup_completed_at := v_completed_at;
  return next;
end;
$$;

comment on function public.complete_school_setup(uuid) is
  'Owner/admin marks school setup complete: pending_setup → active with setup_completed_at. Idempotent when already active.';

revoke all on function public.complete_school_setup(uuid) from public, anon;
grant execute on function public.complete_school_setup(uuid) to authenticated;
