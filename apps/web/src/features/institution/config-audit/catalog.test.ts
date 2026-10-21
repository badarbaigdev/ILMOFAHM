import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONFIG_AUDIT_ACTIONS,
  configAuditActionLabel,
  isConfigAuditAction,
} from "./catalog";

describe("config audit catalog", () => {
  it("recognizes all registered config actions", () => {
    for (const action of CONFIG_AUDIT_ACTIONS) {
      assert.equal(isConfigAuditAction(action), true);
      assert.notEqual(configAuditActionLabel(action), action);
    }
  });

  it("rejects non-config actions", () => {
    assert.equal(isConfigAuditAction("membership.invitation_created"), false);
    assert.equal(isConfigAuditAction("organization.provisioned"), false);
  });
});
