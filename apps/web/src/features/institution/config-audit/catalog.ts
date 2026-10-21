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
  "academic_year.created",
  "academic_year.updated",
  "academic_term.created",
  "grade.created",
  "grade.archived",
  "section.created",
  "subject.created",
  "course.created",
  "course.archived",
  "cohort.created",
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
    case "academic_year.created":
      return "Academic year created";
    case "academic_year.updated":
      return "Academic year updated";
    case "academic_term.created":
      return "Academic term created";
    case "grade.created":
      return "Grade created";
    case "grade.archived":
      return "Grade archived";
    case "section.created":
      return "Section created";
    case "subject.created":
      return "Subject created";
    case "course.created":
      return "Course created";
    case "course.archived":
      return "Course archived";
    case "cohort.created":
      return "Cohort created";
    default:
      return action;
  }
}
