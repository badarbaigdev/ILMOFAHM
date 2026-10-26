import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateEnrolmentInput,
  validateStudentInput,
} from "./validate";

describe("validateStudentInput", () => {
  it("accepts a minimal valid student", () => {
    const result = validateStudentInput({
      studentNumber: " STU-1 ",
      firstName: "Ali",
      lastName: "Khan",
      dateOfBirth: "",
      gender: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.studentNumber, "STU-1");
      assert.equal(result.value.dateOfBirth, null);
    }
  });

  it("rejects blank names", () => {
    const result = validateStudentInput({
      studentNumber: "STU-1",
      firstName: "",
      lastName: "Khan",
      dateOfBirth: "",
      gender: "",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateEnrolmentInput", () => {
  it("accepts enrolment with optional empty section", () => {
    const result = validateEnrolmentInput({
      studentId: "aaaaaaaa-1111-4111-8111-111111111111",
      academicYearId: "bbbbbbbb-2222-4222-8222-222222222222",
      gradeId: "cccccccc-3333-4333-8333-333333333333",
      sectionId: "",
      enrolledOn: "2026-04-01",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.sectionId, null);
    }
  });

  it("rejects missing student id", () => {
    const result = validateEnrolmentInput({
      studentId: "",
      academicYearId: "bbbbbbbb-2222-4222-8222-222222222222",
      gradeId: "cccccccc-3333-4333-8333-333333333333",
      sectionId: "",
      enrolledOn: "2026-04-01",
    });
    assert.equal(result.ok, false);
  });
});
