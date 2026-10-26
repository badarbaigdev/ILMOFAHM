import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  schoolRoleHasPermission,
  SCHOOL_INVITE_ROLES,
  isSchoolInviteRole,
} from "./permissions";

describe("school permission matrix", () => {
  it("gives owners and admins membership invite rights", () => {
    assert.equal(schoolRoleHasPermission("owner", "membership.invite"), true);
    assert.equal(schoolRoleHasPermission("admin", "membership.invite"), true);
  });

  it("denies invite and status manage for teacher/accountant/staff", () => {
    for (const role of ["teacher", "accountant", "staff"] as const) {
      assert.equal(schoolRoleHasPermission(role, "membership.invite"), false);
      assert.equal(
        schoolRoleHasPermission(role, "membership.manage_status"),
        false,
      );
      assert.equal(
        schoolRoleHasPermission(role, "membership.manage_role"),
        false,
      );
    }
  });

  it("allows staff to read memberships but not teachers", () => {
    assert.equal(schoolRoleHasPermission("staff", "membership.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "membership.read"), false);
  });

  it("restricts setup and settings to managers", () => {
    assert.equal(schoolRoleHasPermission("owner", "school.setup.manage"), true);
    assert.equal(schoolRoleHasPermission("admin", "school.settings.manage"), true);
    assert.equal(
      schoolRoleHasPermission("teacher", "school.setup.manage"),
      false,
    );
  });

  it("allows academic read for staff roles and manage for managers", () => {
    assert.equal(schoolRoleHasPermission("owner", "academic.manage"), true);
    assert.equal(schoolRoleHasPermission("admin", "academic.manage"), true);
    assert.equal(schoolRoleHasPermission("teacher", "academic.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "academic.manage"), false);
    assert.equal(schoolRoleHasPermission("staff", "academic.read"), true);
    assert.equal(schoolRoleHasPermission("staff", "academic.manage"), false);
  });

  it("allows student read for staff roles and manage for managers", () => {
    assert.equal(schoolRoleHasPermission("owner", "student.manage"), true);
    assert.equal(schoolRoleHasPermission("teacher", "student.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "student.manage"), false);
    assert.equal(schoolRoleHasPermission("accountant", "student.read"), true);
  });

  it("allows teachers to manage attendance and staff to read only", () => {
    assert.equal(schoolRoleHasPermission("owner", "attendance.manage"), true);
    assert.equal(schoolRoleHasPermission("teacher", "attendance.manage"), true);
    assert.equal(schoolRoleHasPermission("teacher", "attendance.read"), true);
    assert.equal(schoolRoleHasPermission("staff", "attendance.read"), true);
    assert.equal(schoolRoleHasPermission("staff", "attendance.manage"), false);
    assert.equal(
      schoolRoleHasPermission("accountant", "attendance.manage"),
      false,
    );
  });

  it("allows teacher HR manage for managers and read for staff roles", () => {
    assert.equal(schoolRoleHasPermission("owner", "teacher.manage"), true);
    assert.equal(schoolRoleHasPermission("admin", "teacher.manage"), true);
    assert.equal(schoolRoleHasPermission("teacher", "teacher.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "teacher.manage"), false);
    assert.equal(schoolRoleHasPermission("staff", "teacher.read"), true);
  });

  it("allows accountants to manage fees and teachers to read only", () => {
    assert.equal(schoolRoleHasPermission("owner", "fee.manage"), true);
    assert.equal(schoolRoleHasPermission("accountant", "fee.manage"), true);
    assert.equal(schoolRoleHasPermission("accountant", "fee.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "fee.read"), true);
    assert.equal(schoolRoleHasPermission("teacher", "fee.manage"), false);
    assert.equal(schoolRoleHasPermission("staff", "fee.read"), true);
    assert.equal(schoolRoleHasPermission("staff", "fee.manage"), false);
  });
});

describe("school invite roles", () => {
  it("allows staff roles and rejects owner", () => {
    for (const role of SCHOOL_INVITE_ROLES) {
      assert.equal(isSchoolInviteRole(role), true);
    }
    assert.equal(isSchoolInviteRole("owner"), false);
    assert.equal(isSchoolInviteRole("guardian"), false);
  });
});
