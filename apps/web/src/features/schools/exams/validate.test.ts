import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCreateExaminationInput,
  validateExamMarkInput,
  validateExamPaperInput,
} from "./validate";

describe("validateCreateExaminationInput", () => {
  it("accepts a valid exam", () => {
    const result = validateCreateExaminationInput({
      schoolId: "11111111-1111-4111-8111-111111111111",
      academicYearId: "22222222-2222-4222-8222-222222222222",
      academicTermId: "",
      name: "Midterm Spring",
      examType: "midterm",
      startsOn: "2026-03-01",
      endsOn: "2026-03-10",
      publishRanks: "true",
    });
    assert.equal(result.ok, true);
  });

  it("rejects inverted dates", () => {
    const result = validateCreateExaminationInput({
      schoolId: "11111111-1111-4111-8111-111111111111",
      academicYearId: "22222222-2222-4222-8222-222222222222",
      academicTermId: "",
      name: "Midterm",
      examType: "midterm",
      startsOn: "2026-03-10",
      endsOn: "2026-03-01",
      publishRanks: "true",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateExamPaperInput", () => {
  it("rejects pass marks above max", () => {
    const result = validateExamPaperInput({
      examinationId: "11111111-1111-4111-8111-111111111111",
      gradeId: "22222222-2222-4222-8222-222222222222",
      sectionId: "33333333-3333-4333-8333-333333333333",
      subjectId: "44444444-4444-4444-8444-444444444444",
      maxMarks: "100",
      passMarks: "120",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateExamMarkInput", () => {
  it("rejects marks above maximum", () => {
    const result = validateExamMarkInput({
      paperId: "11111111-1111-4111-8111-111111111111",
      studentId: "22222222-2222-4222-8222-222222222222",
      attendanceStatus: "present",
      marksObtained: "105",
      remarks: "",
      maxMarks: 100,
    });
    assert.equal(result.ok, false);
  });

  it("clears marks when absent", () => {
    const result = validateExamMarkInput({
      paperId: "11111111-1111-4111-8111-111111111111",
      studentId: "22222222-2222-4222-8222-222222222222",
      attendanceStatus: "absent",
      marksObtained: "50",
      remarks: "",
      maxMarks: 100,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.marksObtained, null);
  });
});
