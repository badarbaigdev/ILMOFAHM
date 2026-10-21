/** Curated allowlists — must stay aligned with SQL helpers in ORG-003 migration. */

export const ORGANIZATION_TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Riyadh",
  "UTC",
  "Europe/London",
] as const;

export type OrganizationTimezone = (typeof ORGANIZATION_TIMEZONES)[number];

export const ORGANIZATION_LOCALES = ["en", "ur"] as const;

export type OrganizationLocale = (typeof ORGANIZATION_LOCALES)[number];

/** ISO weekdays: 1=Monday … 7=Sunday */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

export function isOrganizationTimezone(
  value: string,
): value is OrganizationTimezone {
  return (ORGANIZATION_TIMEZONES as readonly string[]).includes(value);
}

export function isOrganizationLocale(
  value: string,
): value is OrganizationLocale {
  return (ORGANIZATION_LOCALES as readonly string[]).includes(value);
}

export function localeLabel(locale: OrganizationLocale): string {
  return locale === "ur" ? "Urdu" : "English";
}
