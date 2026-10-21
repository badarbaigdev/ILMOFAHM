import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateCampusProfileInput } from "./validate";

describe("validateCampusProfileInput", () => {
  it("accepts a valid campus with optional contact fields", () => {
    const result = validateCampusProfileInput({
      name: " Main Campus ",
      code: " MAIN ",
      phone: " +92-21-111 ",
      email: " Campus@Example.Test ",
      addressLine: " Block 5 ",
      status: "active",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        name: "Main Campus",
        code: "MAIN",
        phone: "+92-21-111",
        email: "campus@example.test",
        addressLine: "Block 5",
        status: "active",
      });
    }
  });

  it("rejects blank names", () => {
    const result = validateCampusProfileInput({ name: "  " });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /campus name/i);
    }
  });

  it("rejects invalid emails", () => {
    const result = validateCampusProfileInput({
      name: "North",
      email: "not-an-email",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /valid campus email/i);
    }
  });

  it("rejects invalid status values", () => {
    const result = validateCampusProfileInput({
      name: "North",
      status: "deleted",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /active or archived/i);
    }
  });
});
