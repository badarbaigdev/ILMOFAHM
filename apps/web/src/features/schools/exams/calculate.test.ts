import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assignRanks,
  buildStudentExamResult,
  evaluateSubject,
  gradeForPercent,
} from "./calculate";

const bands = [
  { minPercent: 90, maxPercent: 100, gradeLabel: "A+", isPass: true, sortOrder: 1 },
  { minPercent: 80, maxPercent: 89.99, gradeLabel: "A", isPass: true, sortOrder: 2 },
  { minPercent: 50, maxPercent: 79.99, gradeLabel: "C", isPass: true, sortOrder: 3 },
  { minPercent: 0, maxPercent: 49.99, gradeLabel: "F", isPass: false, sortOrder: 4 },
];

describe("gradeForPercent", () => {
  it("maps percentage bands", () => {
    assert.equal(gradeForPercent(95, bands)?.gradeLabel, "A+");
    assert.equal(gradeForPercent(40, bands)?.gradeLabel, "F");
    assert.equal(gradeForPercent(40, bands)?.isPass, false);
  });
});

describe("evaluateSubject", () => {
  it("rejects marks above pass threshold as fail", () => {
    const result = evaluateSubject(
      {
        subjectId: "1",
        subjectName: "Math",
        maxMarks: 100,
        passMarks: 50,
        marksObtained: 40,
        attendanceStatus: "present",
      },
      bands,
    );
    assert.equal(result.passed, false);
    assert.equal(result.gradeLabel, "F");
  });

  it("handles absent and exempt", () => {
    assert.equal(
      evaluateSubject(
        {
          subjectId: "1",
          subjectName: "Math",
          maxMarks: 100,
          passMarks: 50,
          marksObtained: null,
          attendanceStatus: "absent",
        },
        bands,
      ).passed,
      false,
    );
    assert.equal(
      evaluateSubject(
        {
          subjectId: "1",
          subjectName: "Math",
          maxMarks: 100,
          passMarks: 50,
          marksObtained: null,
          attendanceStatus: "exempt",
        },
        bands,
      ).passed,
      null,
    );
  });
});

describe("buildStudentExamResult", () => {
  it("calculates totals and overall pass", () => {
    const result = buildStudentExamResult({
      studentId: "s1",
      examPublished: true,
      bands,
      subjects: [
        {
          subjectId: "m",
          subjectName: "Math",
          maxMarks: 100,
          passMarks: 40,
          marksObtained: 80,
          attendanceStatus: "present",
        },
        {
          subjectId: "e",
          subjectName: "Eng",
          maxMarks: 100,
          passMarks: 40,
          marksObtained: 70,
          attendanceStatus: "present",
        },
      ],
    });
    assert.equal(result.totalObtained, 150);
    assert.equal(result.totalMax, 200);
    assert.equal(result.percent, 75);
    assert.equal(result.overallStatus, "pass");
  });

  it("marks unpublished exams", () => {
    const result = buildStudentExamResult({
      studentId: "s1",
      examPublished: false,
      bands,
      subjects: [],
    });
    assert.equal(result.overallStatus, "unpublished");
  });

  it("fails when any subject fails", () => {
    const result = buildStudentExamResult({
      studentId: "s1",
      examPublished: true,
      bands,
      subjects: [
        {
          subjectId: "m",
          subjectName: "Math",
          maxMarks: 100,
          passMarks: 40,
          marksObtained: 80,
          attendanceStatus: "present",
        },
        {
          subjectId: "e",
          subjectName: "Eng",
          maxMarks: 100,
          passMarks: 40,
          marksObtained: 20,
          attendanceStatus: "present",
        },
      ],
    });
    assert.equal(result.overallStatus, "fail");
  });
});

describe("assignRanks", () => {
  it("assigns competition ranks with ties", () => {
    const base = [
      buildStudentExamResult({
        studentId: "a",
        examPublished: true,
        bands,
        subjects: [
          {
            subjectId: "m",
            subjectName: "Math",
            maxMarks: 100,
            passMarks: 40,
            marksObtained: 90,
            attendanceStatus: "present",
          },
        ],
      }),
      buildStudentExamResult({
        studentId: "b",
        examPublished: true,
        bands,
        subjects: [
          {
            subjectId: "m",
            subjectName: "Math",
            maxMarks: 100,
            passMarks: 40,
            marksObtained: 90,
            attendanceStatus: "present",
          },
        ],
      }),
      buildStudentExamResult({
        studentId: "c",
        examPublished: true,
        bands,
        subjects: [
          {
            subjectId: "m",
            subjectName: "Math",
            maxMarks: 100,
            passMarks: 40,
            marksObtained: 70,
            attendanceStatus: "present",
          },
        ],
      }),
    ];
    const ranked = assignRanks(base, true);
    assert.equal(ranked.find((r) => r.studentId === "a")?.rank, 1);
    assert.equal(ranked.find((r) => r.studentId === "b")?.rank, 1);
    assert.equal(ranked.find((r) => r.studentId === "c")?.rank, 3);
  });
});
