-- Phase 4: Audit pending school application submissions (no sensitive payloads).

create or replace function public.audit_school_application_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.write_audit_event(
      null,
      null,
      'school.application.submitted',
      'school_application',
      new.id,
      jsonb_build_object(
        'institution_type', new.institution_type,
        'country_code', new.country_code,
        'city_present', new.city is not null
      ),
      'success',
      null,
      null
    );
  end if;
  return new;
end;
$$;

comment on function public.audit_school_application_insert() is
  'Appends a sanitized audit row when a pending school application is created. Does not store email or free-text message.';

drop trigger if exists school_applications_audit_insert
  on public.school_applications;

create trigger school_applications_audit_insert
after insert on public.school_applications
for each row
execute function public.audit_school_application_insert();
