import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateSchoolProfileInput } from "./validate";

describe("validateSchoolProfileInput", () => {
  it("accepts a valid school profile", () => {
    const result = validateSchoolProfileInput({
      name: "Green Valley School",
      institutionType: "school",
      email: "office@green.test",
      countryCode: "pk",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.countryCode, "PK");
      assert.equal(result.value.email, "office@green.test");
    }
  });

  it("rejects short names and bad emails", () => {
    assert.equal(
      validateSchoolProfileInput({
        name: "A",
        institutionType: "school",
      }).ok,
      false,
    );
    assert.equal(
      validateSchoolProfileInput({
        name: "Valid School",
        institutionType: "school",
        email: "not-an-email",
      }).ok,
      false,
    );
  });
});
