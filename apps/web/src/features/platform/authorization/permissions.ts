import type { OrgRole } from "./roles";

/**
 * Application permissions. Roles are bundles of these — never treat a role
 * string from the client as authorization by itself.
 */
export const PERMISSIONS = [
  "organization.read",
  "organization.update",
  "membership.read",
  "membership.invite",
  "membership.manage_status",
  "campus.read",
  "campus.manage",
  "academic.read",
  "academic.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS;

/**
 * Role → permission matrix. Keep this the single source for app-layer checks.
 * Database RLS remains the hard boundary for Data API access.
 */
const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  staff: [
    "organization.read",
    "membership.read",
    "campus.read",
    "academic.read",
  ],
  teacher: ["organization.read", "campus.read", "academic.read"],
  finance: ["organization.read", "campus.read", "academic.read"],
  guardian: ["organization.read"],
};

export function permissionsForRole(role: OrgRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(
  role: OrgRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
