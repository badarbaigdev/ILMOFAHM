import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateGuardianInput,
  validateGuardianLinkInput,
} from "./validate";

describe("validateGuardianInput", () => {
  it("accepts name-only guardian", () => {
    const result = validateGuardianInput({
      firstName: "Fatima",
      lastName: "Ahmed",
      email: "",
      phone: "",
    });
    assert.equal(result.ok, true);
  });

  it("rejects invalid email", () => {
    const result = validateGuardianInput({
      firstName: "Fatima",
      lastName: "Ahmed",
      email: "not-an-email",
      phone: "",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateGuardianLinkInput", () => {
  it("accepts a valid link", () => {
    const result = validateGuardianLinkInput({
      studentId: "aaaaaaaa-1111-4111-8111-111111111111",
      guardianId: "bbbbbbbb-2222-4222-8222-222222222222",
      relationship: "mother",
      isPrimary: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects unknown relationship", () => {
    const result = validateGuardianLinkInput({
      studentId: "aaaaaaaa-1111-4111-8111-111111111111",
      guardianId: "bbbbbbbb-2222-4222-8222-222222222222",
      relationship: "cousin",
    });
    assert.equal(result.ok, false);
  });
});
