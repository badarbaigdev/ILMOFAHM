import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PLATFORM_PERMISSIONS,
  platformOperatorHasPermission,
} from "./permissions";

describe("platform operator permissions", () => {
  it("recognizes every defined platform permission", () => {
    for (const permission of PLATFORM_PERMISSIONS) {
      assert.equal(platformOperatorHasPermission(permission), true);
    }
  });

  it("rejects unknown permissions", () => {
    assert.equal(
      platformOperatorHasPermission(
        "organization.update" as (typeof PLATFORM_PERMISSIONS)[number],
      ),
      false,
    );
  });
});
