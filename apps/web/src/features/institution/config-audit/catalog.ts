/**
 * Critical organization/campus configuration actions (ILM-ORG-005 / SRS ILM-ORG-006).
 * These must be written via write_audit_event with actor, timestamp, and
 * before/after metadata where a value changes. Effective time is
 * metadata.effective_at when present, otherwise the audit row created_at
 * (immediate effect).
 */

export const CONFIG_AUDIT_ACTIONS = [
  "organization.profile_updated",
  "organization.locale_settings_updated",
  "organization.branding_updated",
  "organization.holiday_created",
  "organization.holiday_deleted",
  "campus.created",
  "campus.updated",
  "campus.branding_overrides_updated",
] as const;

export type ConfigAuditAction = (typeof CONFIG_AUDIT_ACTIONS)[number];

const CONFIG_ACTION_SET = new Set<string>(CONFIG_AUDIT_ACTIONS);

export function isConfigAuditAction(action: string): boolean {
  return CONFIG_ACTION_SET.has(action);
}

export function configAuditActionLabel(action: string): string {
  switch (action) {
    case "organization.profile_updated":
      return "Organization profile";
    case "organization.locale_settings_updated":
      return "Locale and working days";
    case "organization.branding_updated":
      return "Branding and contact";
    case "organization.holiday_created":
      return "Holiday added";
    case "organization.holiday_deleted":
      return "Holiday removed";
    case "campus.created":
      return "Campus created";
    case "campus.updated":
      return "Campus updated";
    case "campus.branding_overrides_updated":
      return "Campus branding overrides";
    default:
      return action;
  }
}
