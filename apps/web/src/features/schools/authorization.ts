import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getActiveSchoolSupportSession } from "@/features/platform/schools/support";
import {
  schoolRoleHasPermission,
  type SchoolPermission,
} from "@/features/schools/permissions";

export type SchoolRole = "owner" | "admin" | "teacher" | "accountant" | "staff";

export type SchoolMembership = {
  schoolId: string;
  userId: string;
  role: SchoolRole;
  status: "active" | "invited" | "suspended" | "revoked";
};

export class SchoolAuthorizationError extends Error {
  readonly code: "unauthenticated" | "forbidden" | "not_found";

  constructor(
    message: string,
    code: SchoolAuthorizationError["code"] = "forbidden",
  ) {
    super(message);
    this.name = "SchoolAuthorizationError";
    this.code = code;
  }
}

export function isSchoolAuthorizationError(
  error: unknown,
): error is SchoolAuthorizationError {
  return error instanceof SchoolAuthorizationError;
}

const MANAGER_ROLES = new Set<SchoolRole>(["owner", "admin"]);

export function isSchoolManagerRole(role: SchoolRole): boolean {
  return MANAGER_ROLES.has(role);
}

/**
 * Resolve active membership for a school from trusted DB rows.
 * Never trust a client-supplied role.
 */
export async function requireSchoolMembership(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
): Promise<SchoolMembership> {
  const { data, error } = await supabase
    .from("school_memberships")
    .select("school_id, user_id, role, status")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new SchoolAuthorizationError(
      "Could not verify school membership.",
      "forbidden",
    );
  }

  if (!data) {
    throw new SchoolAuthorizationError(
      "You do not have access to this school.",
      "forbidden",
    );
  }

  return {
    schoolId: data.school_id,
    userId: data.user_id,
    role: data.role as SchoolRole,
    status: data.status as SchoolMembership["status"],
  };
}

/**
 * Authorize a school-scoped permission from trusted membership + matrix.
 * Active platform support sessions act as school admin for the granted school.
 */
export async function authorizeSchool(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
  permission: SchoolPermission,
): Promise<SchoolMembership> {
  try {
    const membership = await requireSchoolMembership(
      supabase,
      userId,
      schoolId,
    );
    if (!schoolRoleHasPermission(membership.role, permission)) {
      throw new SchoolAuthorizationError(
        "You do not have permission to perform this school action.",
        "forbidden",
      );
    }
    return membership;
  } catch (error) {
    if (!isSchoolAuthorizationError(error) || error.code !== "forbidden") {
      throw error;
    }
  }

  const support = await getActiveSchoolSupportSession(
    supabase,
    schoolId,
    userId,
  );
  if (!support) {
    throw new SchoolAuthorizationError(
      "You do not have access to this school.",
      "forbidden",
    );
  }
  if (!schoolRoleHasPermission("admin", permission)) {
    throw new SchoolAuthorizationError(
      "You do not have permission to perform this school action.",
      "forbidden",
    );
  }
  return {
    schoolId,
    userId,
    role: "admin",
    status: "active",
  };
}

export async function canSchool(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
  permission: SchoolPermission,
): Promise<boolean> {
  try {
    await authorizeSchool(supabase, userId, schoolId, permission);
    return true;
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return false;
    }
    throw error;
  }
}

export async function requireSchoolManager(
  supabase: SupabaseClient,
  userId: string,
  schoolId: string,
): Promise<SchoolMembership> {
  return authorizeSchool(supabase, userId, schoolId, "school.setup.manage");
}
