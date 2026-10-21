import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
} from "./permissions";
import { ORG_ROLES } from "./roles";

describe("role permission matrix", () => {
  it("gives owners and admins every defined permission", () => {
    for (const permission of PERMISSIONS) {
      assert.equal(roleHasPermission("owner", permission), true);
      assert.equal(roleHasPermission("admin", permission), true);
    }
  });

  it("denies teachers membership invite and status management", () => {
    assert.equal(roleHasPermission("teacher", "membership.invite"), false);
    assert.equal(
      roleHasPermission("teacher", "membership.manage_status"),
      false,
    );
    assert.equal(roleHasPermission("teacher", "organization.read"), true);
  });

  it("keeps guardian permissions minimal", () => {
    assert.deepEqual(permissionsForRole("guardian"), ["organization.read"]);
  });

  it("defines permissions for every org role", () => {
    for (const role of ORG_ROLES) {
      assert.ok(permissionsForRole(role).length > 0);
    }
  });
});
