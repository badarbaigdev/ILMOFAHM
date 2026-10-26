import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateAttendanceMarksInput,
  validateCorrectAttendanceInput,
  validateOpenAttendanceInput,
} from "./validate";

describe("validateOpenAttendanceInput", () => {
  it("accepts school, section, and ISO date", () => {
    const result = validateOpenAttendanceInput({
      schoolId: "11111111-1111-4111-8111-111111111111",
      sectionId: "22222222-2222-4222-8222-222222222222",
      attendanceDate: "2026-10-22",
    });
    assert.equal(result.ok, true);
  });

  it("rejects missing date", () => {
    const result = validateOpenAttendanceInput({
      schoolId: "11111111-1111-4111-8111-111111111111",
      sectionId: "22222222-2222-4222-8222-222222222222",
      attendanceDate: "",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateAttendanceMarksInput", () => {
  it("accepts a roster of statuses", () => {
    const result = validateAttendanceMarksInput([
      {
        studentId: "33333333-3333-4333-8333-333333333333",
        status: "absent",
        note: "Sick",
      },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value[0]?.status, "absent");
    }
  });

  it("rejects invalid status", () => {
    const result = validateAttendanceMarksInput([
      {
        studentId: "33333333-3333-4333-8333-333333333333",
        status: "missing",
        note: "",
      },
    ]);
    assert.equal(result.ok, false);
  });
});

describe("validateCorrectAttendanceInput", () => {
  it("requires a reason", () => {
    const result = validateCorrectAttendanceInput({
      markId: "44444444-4444-4444-8444-444444444444",
      status: "present",
      reason: "ok",
    });
    assert.equal(result.ok, false);
  });

  it("accepts a correction", () => {
    const result = validateCorrectAttendanceInput({
      markId: "44444444-4444-4444-8444-444444444444",
      status: "late",
      reason: "Bus delay confirmed",
    });
    assert.equal(result.ok, true);
  });
});
