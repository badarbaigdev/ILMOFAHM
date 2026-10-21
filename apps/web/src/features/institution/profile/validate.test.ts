import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateOrganizationProfileInput } from "./validate";

describe("validateOrganizationProfileInput", () => {
  it("accepts a valid name and institution type", () => {
    const result = validateOrganizationProfileInput({
      name: " Green Valley ",
      institutionType: "school",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        name: "Green Valley",
        institutionType: "school",
      });
    }
  });

  it("rejects short names", () => {
    const result = validateOrganizationProfileInput({
      name: "A",
      institutionType: "academy",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 2 characters/i);
    }
  });

  it("rejects invalid institution types", () => {
    const result = validateOrganizationProfileInput({
      name: "Green Valley",
      institutionType: "college",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /school, academy, or both/i);
    }
  });
});
