import type { SchoolRecord } from "@/features/schools/context";

/** Display name for chrome, headers, and printouts. */
export function schoolBrandName(school: Pick<
  SchoolRecord,
  "name" | "brandDisplayName"
>): string {
  return school.brandDisplayName?.trim() || school.name;
}

export function schoolBrandLogoUrl(
  school: Pick<SchoolRecord, "brandLogoUrl">,
): string | null {
  return school.brandLogoUrl?.trim() || null;
}
