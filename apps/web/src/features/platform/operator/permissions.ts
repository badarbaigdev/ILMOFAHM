/**
 * Platform-operator (Superadmin) permissions.
 * Distinct from school/organization membership permissions.
 * Active operators hold the full set for the current MVP.
 */
export const PLATFORM_PERMISSIONS = [
  "platform.organizations.read",
  "platform.organizations.manage",
  "platform.applications.read",
  "platform.applications.manage",
  "platform.schools.read",
  "platform.operators.read",
  "platform.operators.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

/** Active operators hold the full platform permission set for this MVP. */
export function platformOperatorHasPermission(
  permission: PlatformPermission,
): boolean {
  return (PLATFORM_PERMISSIONS as readonly string[]).includes(permission);
}
