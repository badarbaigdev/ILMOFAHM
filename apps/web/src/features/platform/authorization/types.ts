import type { Permission } from "@/features/platform/authorization/permissions";
import type { OrgRole } from "@/features/platform/authorization/roles";

export type MembershipStatus = "invited" | "active" | "suspended" | "revoked";

export type TrustedMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  status: MembershipStatus;
};

export type TrustedCampus = {
  id: string;
  organizationId: string;
};

/**
 * Optional resource scope. Campus is enforced against the campuses table.
 * Class and guardian-student scopes fail closed until those domain tables exist
 * and a real checker is supplied via AuthorizationDeps.
 */
export type AuthorizationScope =
  | { type: "campus"; campusId: string }
  | { type: "class"; classId: string }
  | { type: "guardian_student"; studentId: string };

export type AuthorizeRequest = {
  /** Client-supplied org id is only a hint — membership is loaded from the DB. */
  organizationId: string;
  permission: Permission;
  scope?: AuthorizationScope;
};

export type AuthContext = {
  userId: string;
  membership: TrustedMembership;
  permission: Permission;
  campus?: TrustedCampus;
};

export type AuthorizationDeps = {
  getUserId: () => Promise<string | null>;
  /**
   * Must return only an *active* membership for (userId, organizationId),
   * or null. Never invent membership from client input alone.
   */
  getActiveMembership: (
    userId: string,
    organizationId: string,
  ) => Promise<TrustedMembership | null>;
  getCampus: (campusId: string) => Promise<TrustedCampus | null>;
  /** Defaults to deny until class-assignment module exists. */
  hasClassAssignment: (
    userId: string,
    organizationId: string,
    classId: string,
  ) => Promise<boolean>;
  /** Defaults to deny until guardian-student links exist (ILM-STU-002). */
  hasGuardianStudentLink: (
    userId: string,
    organizationId: string,
    studentId: string,
  ) => Promise<boolean>;
};
