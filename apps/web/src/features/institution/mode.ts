/**
 * Institution operating mode helpers (ILM-ORG-001 / ILM-ORG-002).
 * Use these to gate school-only vs academy-only workflows in the UI and
 * server logic. Never trust a client-supplied mode — load from the org row.
 */

export const INSTITUTION_TYPES = ["school", "academy", "both"] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export function isInstitutionType(value: string): value is InstitutionType {
  return (INSTITUTION_TYPES as readonly string[]).includes(value);
}

export function supportsSchool(type: InstitutionType): boolean {
  return type === "school" || type === "both";
}

export function supportsAcademy(type: InstitutionType): boolean {
  return type === "academy" || type === "both";
}

export function institutionTypeLabel(type: InstitutionType): string {
  switch (type) {
    case "school":
      return "School";
    case "academy":
      return "Academy";
    case "both":
      return "School and academy";
  }
}
