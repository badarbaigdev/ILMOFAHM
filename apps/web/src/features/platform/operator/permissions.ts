/**
 * Platform-operator (Superadmin) permissions.
 * Distinct from organization membership permissions.
 */
export const PLATFORM_PERMISSIONS = [
  "platform.organizations.read",
  "platform.organizations.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

/** Active operators hold the full platform permission set for this MVP. */
export function platformOperatorHasPermission(
  permission: PlatformPermission,
): boolean {
  return (PLATFORM_PERMISSIONS as readonly string[]).includes(permission);
}
