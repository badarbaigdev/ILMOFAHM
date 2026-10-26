import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateTeacherId, validateTeacherInput } from "./validate";

describe("validateTeacherInput", () => {
  it("accepts a minimal valid teacher", () => {
    const result = validateTeacherInput({
      staffNumber: " T-01 ",
      firstName: "Sara",
      lastName: "Malik",
      email: "",
      phone: "",
      primarySubject: "Math",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.staffNumber, "T-01");
      assert.equal(result.value.primarySubject, "Math");
      assert.equal(result.value.email, null);
    }
  });

  it("rejects blank staff number", () => {
    const result = validateTeacherInput({
      staffNumber: "  ",
      firstName: "Sara",
      lastName: "Malik",
      email: "",
      phone: "",
      primarySubject: "",
    });
    assert.equal(result.ok, false);
  });

  it("rejects invalid email", () => {
    const result = validateTeacherInput({
      staffNumber: "T-01",
      firstName: "Sara",
      lastName: "Malik",
      email: "not-an-email",
      phone: "",
      primarySubject: "",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateTeacherId", () => {
  it("accepts a uuid", () => {
    const result = validateTeacherId(
      "aaaaaaaa-1111-4111-8111-111111111111",
    );
    assert.equal(result.ok, true);
  });

  it("rejects empty id", () => {
    assert.equal(validateTeacherId("").ok, false);
  });
});
