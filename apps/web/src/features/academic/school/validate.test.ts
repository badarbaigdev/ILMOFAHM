import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateGradeInput,
  validateSectionInput,
  validateSubjectInput,
} from "./validate";

describe("school structure validation", () => {
  it("accepts a valid grade", () => {
    const result = validateGradeInput({
      name: "Grade 5",
      code: "G5",
      sortOrder: "5",
    });
    assert.equal(result.ok, true);
  });

  it("rejects blank section name", () => {
    assert.equal(validateSectionInput({ name: " ", capacity: "" }).ok, false);
  });

  it("accepts subject without code", () => {
    const result = validateSubjectInput({ name: "Mathematics", code: "" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.code, null);
  });

  it("rejects non-positive capacity", () => {
    assert.equal(validateSectionInput({ name: "A", capacity: "0" }).ok, false);
  });
});
