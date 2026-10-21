-- ILM-ORG-005: Document critical configuration audit actions
--
-- Profile, locale, branding, campus, and holiday RPCs already emit
-- write_audit_event rows with actor, timestamp, and before/after metadata
-- where values change. This migration records the canonical action list for
-- operators and future filters. No new tables: reuse audit_events.

comment on table public.audit_events is
  'Append-only audit trail for privileged actions. Config actions (ILM-ORG-005): organization.profile_updated, organization.locale_settings_updated, organization.branding_updated, organization.holiday_created, organization.holiday_deleted, campus.created, campus.updated, campus.branding_overrides_updated. Writers are SECURITY DEFINER helpers only; managers may SELECT.';
