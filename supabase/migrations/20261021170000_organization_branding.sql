-- ILM-ORG-004: Organization branding and contact + campus overrides
--
-- Aligns with SRS campus branding/contact (ILM-ORG-005) without receipt/report
-- templates. Logo is a URL string only — private Storage uploads arrive later.
-- Null campus branding fields mean "inherit organization branding".

-- ---------------------------------------------------------------------------
-- organizations branding / contact
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website_url text,
  add column if not exists brand_display_name text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_logo_url text;

alter table public.organizations
  drop constraint if exists organizations_contact_email_format,
  drop constraint if exists organizations_contact_phone_not_blank,
  drop constraint if exists organizations_website_url_format,
  drop constraint if exists organizations_brand_display_name_not_blank,
  drop constraint if exists organizations_brand_primary_color_format,
  drop constraint if exists organizations_brand_logo_url_format;

alter table public.organizations
  add constraint organizations_contact_email_format check (
    contact_email is null
    or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  add constraint organizations_contact_phone_not_blank check (
    contact_phone is null or length(trim(contact_phone)) > 0
  ),
  add constraint organizations_website_url_format check (
    website_url is null
    or website_url ~* '^https?://[^\s]+$'
  ),
  add constraint organizations_brand_display_name_not_blank check (
    brand_display_name is null or length(trim(brand_display_name)) > 0
  ),
  add constraint organizations_brand_primary_color_format check (
    brand_primary_color is null
    or brand_primary_color ~* '^#[0-9a-fA-F]{6}$'
  ),
  add constraint organizations_brand_logo_url_format check (
    brand_logo_url is null
    or brand_logo_url ~* '^https://[^\s]+$'
  );

comment on column public.organizations.contact_email is
  'Primary institution contact email (display/ops; not an auth factor).';
comment on column public.organizations.contact_phone is
  'Primary institution contact phone (display/ops; not an auth factor).';
comment on column public.organizations.website_url is
  'Optional public website URL (http or https).';
comment on column public.organizations.brand_display_name is
  'Optional public-facing brand name; falls back to organizations.name when null.';
comment on column public.organizations.brand_primary_color is
  'Optional brand accent as #RRGGBB. Receipt templates are out of scope here.';
comment on column public.organizations.brand_logo_url is
  'Optional https logo URL. Private Storage uploads are a later milestone.';

-- ---------------------------------------------------------------------------
-- campus branding overrides (null = inherit org)
-- ---------------------------------------------------------------------------

alter table public.campuses
  add column if not exists brand_display_name text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_logo_url text;

alter table public.campuses
  drop constraint if exists campuses_brand_display_name_not_blank,
  drop constraint if exists campuses_brand_primary_color_format,
  drop constraint if exists campuses_brand_logo_url_format;

alter table public.campuses
  add constraint campuses_brand_display_name_not_blank check (
    brand_display_name is null or length(trim(brand_display_name)) > 0
  ),
  add constraint campuses_brand_primary_color_format check (
    brand_primary_color is null
    or brand_primary_color ~* '^#[0-9a-fA-F]{6}$'
  ),
  add constraint campuses_brand_logo_url_format check (
    brand_logo_url is null
    or brand_logo_url ~* '^https://[^\s]+$'
  );

comment on column public.campuses.brand_display_name is
  'Optional campus brand name override; null inherits organization branding.';
comment on column public.campuses.brand_primary_color is
  'Optional campus accent override (#RRGGBB); null inherits organization branding.';
comment on column public.campuses.brand_logo_url is
  'Optional campus logo URL override (https); null inherits organization branding.';

-- ---------------------------------------------------------------------------
-- update_organization_branding
-- ---------------------------------------------------------------------------

create or replace function public.update_organization_branding(
  p_organization_id uuid,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_website_url text default null,
  p_brand_display_name text default null,
  p_brand_primary_color text default null,
  p_brand_logo_url text default null
)
returns table (
  organization_id uuid,
  contact_email text,
  contact_phone text,
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
  v_email text := lower(nullif(trim(p_contact_email), ''));
  v_phone text := nullif(trim(p_contact_phone), '');
  v_website text := nullif(trim(p_website_url), '');
  v_display text := nullif(trim(p_brand_display_name), '');
  v_color text := nullif(trim(p_brand_primary_color), '');
  v_logo text := nullif(trim(p_brand_logo_url), '');
  v_old jsonb;
  v_new_email text;
  v_new_phone text;
  v_new_website text;
  v_new_display text;
  v_new_color text;
  v_new_logo text;
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
    raise exception 'Not authorized to update branding for this organization'
      using errcode = '42501';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Valid contact email is required when provided'
      using errcode = '22023';
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

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = p_organization_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  select jsonb_build_object(
           'contact_email', o.contact_email,
           'contact_phone', o.contact_phone,
           'website_url', o.website_url,
           'brand_display_name', o.brand_display_name,
           'brand_primary_color', o.brand_primary_color,
           'brand_logo_url', o.brand_logo_url
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
    contact_email = v_email,
    contact_phone = v_phone,
    website_url = v_website,
    brand_display_name = v_display,
    brand_primary_color = v_color,
    brand_logo_url = v_logo
  where o.id = p_organization_id;

  select
    o.contact_email,
    o.contact_phone,
    o.website_url,
    o.brand_display_name,
    o.brand_primary_color,
    o.brand_logo_url
  into strict
    v_new_email,
    v_new_phone,
    v_new_website,
    v_new_display,
    v_new_color,
    v_new_logo
  from public.organizations as o
  where o.id = p_organization_id;

  if v_old is distinct from jsonb_build_object(
       'contact_email', v_new_email,
       'contact_phone', v_new_phone,
       'website_url', v_new_website,
       'brand_display_name', v_new_display,
       'brand_primary_color', v_new_color,
       'brand_logo_url', v_new_logo
     ) then
    perform public.write_audit_event(
      p_organization_id,
      v_user_id,
      'organization.branding_updated',
      'organization',
      p_organization_id,
      jsonb_build_object(
        'before', v_old,
        'after', jsonb_build_object(
          'contact_email', v_new_email,
          'contact_phone', v_new_phone,
          'website_url', v_new_website,
          'brand_display_name', v_new_display,
          'brand_primary_color', v_new_color,
          'brand_logo_url', v_new_logo
        )
      ),
      'success',
      v_role
    );
  end if;

  organization_id := p_organization_id;
  contact_email := v_new_email;
  contact_phone := v_new_phone;
  website_url := v_new_website;
  brand_display_name := v_new_display;
  brand_primary_color := v_new_color;
  brand_logo_url := v_new_logo;
  return next;
end;
$$;

comment on function public.update_organization_branding(
  uuid, text, text, text, text, text, text
) is
  'Owner/admin updates organization contact and branding fields. Audited. No receipt templates.';

revoke all on function public.update_organization_branding(
  uuid, text, text, text, text, text, text
) from public, anon;

grant execute on function public.update_organization_branding(
  uuid, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- update_campus_branding_overrides
-- ---------------------------------------------------------------------------

create or replace function public.update_campus_branding_overrides(
  p_campus_id uuid,
  p_brand_display_name text default null,
  p_brand_primary_color text default null,
  p_brand_logo_url text default null
)
returns table (
  campus_id uuid,
  organization_id uuid,
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
  v_org_id uuid;
  v_display text := nullif(trim(p_brand_display_name), '');
  v_color text := nullif(trim(p_brand_primary_color), '');
  v_logo text := nullif(trim(p_brand_logo_url), '');
  v_old jsonb;
  v_new_display text;
  v_new_color text;
  v_new_logo text;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_campus_id is null then
    raise exception 'campus_id is required'
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

  select c.organization_id,
         jsonb_build_object(
           'brand_display_name', c.brand_display_name,
           'brand_primary_color', c.brand_primary_color,
           'brand_logo_url', c.brand_logo_url
         )
  into v_org_id, v_old
  from public.campuses as c
  where c.id = p_campus_id
  for update;

  if not found then
    raise exception 'Campus not found'
      using errcode = 'P0002';
  end if;

  if not public.is_org_manager(v_org_id) then
    raise exception 'Not authorized to update branding for this organization'
      using errcode = '42501';
  end if;

  select m.role
  into v_role
  from public.organization_memberships as m
  where m.organization_id = v_org_id
    and m.user_id = v_user_id
    and m.status = 'active'
  limit 1;

  update public.campuses as c
  set
    brand_display_name = v_display,
    brand_primary_color = v_color,
    brand_logo_url = v_logo
  where c.id = p_campus_id;

  select c.brand_display_name, c.brand_primary_color, c.brand_logo_url
  into strict v_new_display, v_new_color, v_new_logo
  from public.campuses as c
  where c.id = p_campus_id;

  if v_old is distinct from jsonb_build_object(
       'brand_display_name', v_new_display,
       'brand_primary_color', v_new_color,
       'brand_logo_url', v_new_logo
     ) then
    perform public.write_audit_event(
      v_org_id,
      v_user_id,
      'campus.branding_overrides_updated',
      'campus',
      p_campus_id,
      jsonb_build_object(
        'before', v_old,
        'after', jsonb_build_object(
          'brand_display_name', v_new_display,
          'brand_primary_color', v_new_color,
          'brand_logo_url', v_new_logo
        )
      ),
      'success',
      v_role
    );
  end if;

  campus_id := p_campus_id;
  organization_id := v_org_id;
  brand_display_name := v_new_display;
  brand_primary_color := v_new_color;
  brand_logo_url := v_new_logo;
  return next;
end;
$$;

comment on function public.update_campus_branding_overrides(
  uuid, text, text, text
) is
  'Owner/admin sets campus branding overrides. Null/blank clears override (inherit org). Audited.';

revoke all on function public.update_campus_branding_overrides(
  uuid, text, text, text
) from public, anon;

grant execute on function public.update_campus_branding_overrides(
  uuid, text, text, text
) to authenticated;
