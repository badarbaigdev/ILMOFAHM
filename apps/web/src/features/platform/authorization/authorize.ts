import { AuthorizationError } from "./errors";
import { roleHasPermission } from "./permissions";
import type { AuthContext, AuthorizationDeps, AuthorizeRequest } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new AuthorizationError("invalid_scope", `Invalid ${label}.`);
  }
}

/**
 * Central server-side authorization gate.
 *
 * 1. Authenticated user (from trusted session — not a body field)
 * 2. Active membership for organizationId (re-loaded from DB)
 * 3. Role grants the requested permission
 * 4. Optional campus/class/guardian scope
 *
 * Client-supplied organization/campus/student IDs are never trusted alone.
 * UI role checks must call this (or equivalent) before mutations.
 */
export async function authorize(
  request: AuthorizeRequest,
  deps: AuthorizationDeps,
): Promise<AuthContext> {
  assertUuid(request.organizationId, "organization");

  const userId = await deps.getUserId();
  if (!userId) {
    throw new AuthorizationError(
      "unauthenticated",
      "You must be signed in to continue.",
    );
  }

  const membership = await deps.getActiveMembership(
    userId,
    request.organizationId,
  );

  if (!membership || membership.status !== "active") {
    // Same message for missing org and non-membership — avoid tenant oracle.
    throw new AuthorizationError(
      "not_a_member",
      "You do not have access to this organization.",
    );
  }

  if (membership.organizationId !== request.organizationId) {
    throw new AuthorizationError(
      "cross_tenant_scope",
      "You do not have access to this organization.",
    );
  }

  if (!roleHasPermission(membership.role, request.permission)) {
    throw new AuthorizationError(
      "missing_permission",
      "You do not have permission to perform this action.",
    );
  }

  if (!request.scope) {
    return { userId, membership, permission: request.permission };
  }

  if (request.scope.type === "campus") {
    assertUuid(request.scope.campusId, "campus");
    const campus = await deps.getCampus(request.scope.campusId);
    if (!campus || campus.organizationId !== membership.organizationId) {
      throw new AuthorizationError(
        "cross_tenant_scope",
        "Campus is not available in this organization.",
      );
    }
    if (campus.status !== "active") {
      throw new AuthorizationError(
        "invalid_scope",
        "This campus is archived and cannot be used.",
      );
    }
    return {
      userId,
      membership,
      permission: request.permission,
      campus,
    };
  }

  if (request.scope.type === "class") {
    assertUuid(request.scope.classId, "class");
    const allowed = await deps.hasClassAssignment(
      userId,
      membership.organizationId,
      request.scope.classId,
    );
    if (!allowed) {
      throw new AuthorizationError(
        "invalid_scope",
        "You do not have access to this class.",
      );
    }
    return { userId, membership, permission: request.permission };
  }

  if (request.scope.type === "guardian_student") {
    assertUuid(request.scope.studentId, "student");
    const allowed = await deps.hasGuardianStudentLink(
      userId,
      membership.organizationId,
      request.scope.studentId,
    );
    if (!allowed) {
      throw new AuthorizationError(
        "invalid_scope",
        "You do not have access to this student.",
      );
    }
    return { userId, membership, permission: request.permission };
  }

  throw new AuthorizationError(
    "invalid_scope",
    "Unsupported authorization scope.",
  );
}

/** Convenience: true/false without throwing (for UX gating only). */
export async function can(
  request: AuthorizeRequest,
  deps: AuthorizationDeps,
): Promise<boolean> {
  try {
    await authorize(request, deps);
    return true;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return false;
    }
    throw error;
  }
}
