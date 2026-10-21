/** Organization-level roles stored on organization_memberships.role */
export const ORG_ROLES = [
  "owner",
  "admin",
  "staff",
  "teacher",
  "finance",
  "guardian",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}
