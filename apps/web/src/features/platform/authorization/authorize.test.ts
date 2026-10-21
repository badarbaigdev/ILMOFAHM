import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authorize, can } from "./authorize";
import { AuthorizationError } from "./errors";
import type { AuthorizationDeps, TrustedMembership } from "./types";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const CAMPUS_A = "33333333-3333-4333-8333-333333333333";
const CAMPUS_B = "44444444-4444-4444-8444-444444444444";
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLASS_ID = "55555555-5555-4555-8555-555555555555";
const STUDENT_ID = "66666666-6666-4666-8666-666666666666";

function membership(
  overrides: Partial<TrustedMembership> = {},
): TrustedMembership {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId: ORG_A,
    userId: USER,
    role: "owner",
    status: "active",
    ...overrides,
  };
}

function deps(
  overrides: Partial<AuthorizationDeps> & {
    membership?: TrustedMembership | null;
  } = {},
): AuthorizationDeps {
  const { membership: membershipOverride, ...rest } = overrides;
  const resolvedMembership =
    membershipOverride === undefined ? membership() : membershipOverride;

  return {
    getUserId: async () => USER,
    getActiveMembership: async () => resolvedMembership,
    getCampus: async (campusId) => {
      if (campusId === CAMPUS_A) {
        return { id: CAMPUS_A, organizationId: ORG_A };
      }
      if (campusId === CAMPUS_B) {
        return { id: CAMPUS_B, organizationId: ORG_B };
      }
      return null;
    },
    hasClassAssignment: async () => false,
    hasGuardianStudentLink: async () => false,
    ...rest,
  };
}

describe("authorize", () => {
  it("allows an active owner with the required permission", async () => {
    const ctx = await authorize(
      { organizationId: ORG_A, permission: "membership.invite" },
      deps(),
    );
    assert.equal(ctx.userId, USER);
    assert.equal(ctx.membership.role, "owner");
  });

  it("denies unauthenticated callers", async () => {
    await assert.rejects(
      () =>
        authorize(
          { organizationId: ORG_A, permission: "organization.read" },
          deps({ getUserId: async () => null }),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError && error.code === "unauthenticated",
    );
  });

  it("denies when no active membership exists for the body organization id", async () => {
    await assert.rejects(
      () =>
        authorize(
          { organizationId: ORG_B, permission: "membership.invite" },
          deps({
            membership: null,
            getActiveMembership: async () => null,
          }),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError && error.code === "not_a_member",
    );
  });

  it("denies teachers inviting members even with a forged organization id", async () => {
    await assert.rejects(
      () =>
        authorize(
          { organizationId: ORG_A, permission: "membership.invite" },
          deps({ membership: membership({ role: "teacher" }) }),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError &&
        error.code === "missing_permission",
    );
  });

  it("denies suspended memberships", async () => {
    // Active-membership loader returns null for suspended rows.
    await assert.rejects(
      () =>
        authorize(
          { organizationId: ORG_A, permission: "organization.read" },
          deps({ membership: null }),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError && error.code === "not_a_member",
    );
  });

  it("allows campus scope only when campus belongs to the authorized org", async () => {
    const ctx = await authorize(
      {
        organizationId: ORG_A,
        permission: "campus.read",
        scope: { type: "campus", campusId: CAMPUS_A },
      },
      deps(),
    );
    assert.equal(ctx.campus?.id, CAMPUS_A);
  });

  it("rejects a campus id from another tenant even for an org owner", async () => {
    await assert.rejects(
      () =>
        authorize(
          {
            organizationId: ORG_A,
            permission: "campus.manage",
            scope: { type: "campus", campusId: CAMPUS_B },
          },
          deps(),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError &&
        error.code === "cross_tenant_scope",
    );
  });

  it("fails closed for class scope until assignments exist", async () => {
    await assert.rejects(
      () =>
        authorize(
          {
            organizationId: ORG_A,
            permission: "campus.read",
            scope: { type: "class", classId: CLASS_ID },
          },
          deps(),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError && error.code === "invalid_scope",
    );
  });

  it("fails closed for guardian student scope without a verified link", async () => {
    await assert.rejects(
      () =>
        authorize(
          {
            organizationId: ORG_A,
            permission: "organization.read",
            scope: { type: "guardian_student", studentId: STUDENT_ID },
          },
          deps({ membership: membership({ role: "guardian" }) }),
        ),
      (error: unknown) =>
        error instanceof AuthorizationError && error.code === "invalid_scope",
    );
  });

  it("allows guardian student scope when the link checker confirms", async () => {
    const ctx = await authorize(
      {
        organizationId: ORG_A,
        permission: "organization.read",
        scope: { type: "guardian_student", studentId: STUDENT_ID },
      },
      deps({
        membership: membership({ role: "guardian" }),
        hasGuardianStudentLink: async () => true,
      }),
    );
    assert.equal(ctx.membership.role, "guardian");
  });

  it("can() is false on denial and does not throw", async () => {
    assert.equal(
      await can(
        { organizationId: ORG_A, permission: "membership.invite" },
        deps({ membership: membership({ role: "teacher" }) }),
      ),
      false,
    );
  });
});
