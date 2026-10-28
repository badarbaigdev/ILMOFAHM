import type { SchoolRole } from "@/features/schools/authorization";

/**
 * School application permissions. Roles are bundles of these — never treat a
 * client-supplied role string as authorization by itself.
 */
export const SCHOOL_PERMISSIONS = [
  "school.read",
  "school.setup.manage",
  "school.settings.manage",
  "membership.read",
  "membership.invite",
  "membership.manage_status",
  "membership.manage_role",
  "campus.read",
  "campus.manage",
  "academic.read",
  "academic.manage",
  "student.read",
  "student.manage",
  "attendance.read",
  "attendance.manage",
  "teacher.read",
  "teacher.manage",
  "fee.read",
  "fee.manage",
  "exam.read",
  "exam.manage",
] as const;

export type SchoolPermission = (typeof SCHOOL_PERMISSIONS)[number];

const ALL: readonly SchoolPermission[] = SCHOOL_PERMISSIONS;

/**
 * Role → permission matrix. Single source for app-layer school checks.
 * Database RLS remains the hard boundary for Data API access.
 */
const ROLE_PERMISSIONS: Record<SchoolRole, readonly SchoolPermission[]> = {
  owner: ALL,
  admin: ALL,
  staff: [
    "school.read",
    "membership.read",
    "campus.read",
    "academic.read",
    "student.read",
    "attendance.read",
    "teacher.read",
    "fee.read",
    "exam.read",
  ],
  teacher: [
    "school.read",
    "campus.read",
    "academic.read",
    "student.read",
    "attendance.read",
    "attendance.manage",
    "teacher.read",
    "fee.read",
    "exam.read",
    "exam.manage",
  ],
  accountant: [
    "school.read",
    "campus.read",
    "academic.read",
    "student.read",
    "attendance.read",
    "teacher.read",
    "fee.read",
    "fee.manage",
    "exam.read",
  ],
};

export function schoolPermissionsForRole(
  role: SchoolRole,
): readonly SchoolPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function schoolRoleHasPermission(
  role: SchoolRole,
  permission: SchoolPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const SCHOOL_INVITE_ROLES = [
  "admin",
  "teacher",
  "accountant",
  "staff",
] as const;

export type SchoolInviteRole = (typeof SCHOOL_INVITE_ROLES)[number];

export function isSchoolInviteRole(value: string): value is SchoolInviteRole {
  return (SCHOOL_INVITE_ROLES as readonly string[]).includes(value);
}
