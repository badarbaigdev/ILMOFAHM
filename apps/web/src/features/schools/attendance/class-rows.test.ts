import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAttendanceClassRows } from "./class-rows";

describe("buildAttendanceClassRows", () => {
  const grades = [
    {
      id: "g2",
      schoolId: "s1",
      name: "Grade 2",
      code: "G2",
      sortOrder: 2,
      status: "active",
    },
    {
      id: "g1",
      schoolId: "s1",
      name: "Grade 1",
      code: "G1",
      sortOrder: 1,
      status: "active",
    },
  ];
  const sections = [
    {
      id: "sec-b",
      schoolId: "s1",
      gradeId: "g1",
      name: "B",
      capacity: 30,
      status: "active",
    },
    {
      id: "sec-a",
      schoolId: "s1",
      gradeId: "g1",
      name: "A",
      capacity: 30,
      status: "active",
    },
    {
      id: "sec-empty",
      schoolId: "s1",
      gradeId: "g2",
      name: "A",
      capacity: 30,
      status: "active",
    },
    {
      id: "sec-inactive",
      schoolId: "s1",
      gradeId: "g2",
      name: "Z",
      capacity: 30,
      status: "archived",
    },
  ];

  it("lists all active sections, including those with no enrolled students", () => {
    const rows = buildAttendanceClassRows({
      grades,
      sections,
      enrolments: [
        {
          id: "e1",
          schoolId: "s1",
          studentId: "st1",
          academicYearId: "y1",
          gradeId: "g1",
          sectionId: "sec-b",
          status: "enrolled",
          enrolledOn: "2026-01-01",
        },
        {
          id: "e2",
          schoolId: "s1",
          studentId: "st2",
          academicYearId: "y1",
          gradeId: "g1",
          sectionId: "sec-a",
          status: "enrolled",
          enrolledOn: "2026-01-01",
        },
        {
          id: "e3",
          schoolId: "s1",
          studentId: "st3",
          academicYearId: "y1",
          gradeId: "g1",
          sectionId: "sec-a",
          status: "withdrawn",
          enrolledOn: "2026-01-01",
        },
        {
          id: "e4",
          schoolId: "s1",
          studentId: "st4",
          academicYearId: "y1",
          gradeId: "g2",
          sectionId: null,
          status: "enrolled",
          enrolledOn: "2026-01-01",
        },
      ],
      daySessions: [
        {
          id: "sess1",
          schoolId: "s1",
          sectionId: "sec-a",
          attendanceDate: "2026-10-27",
          status: "draft",
          submittedAt: null,
        },
      ],
    });

    assert.deepEqual(
      rows.map((r) => ({
        sectionId: r.sectionId,
        label: `${r.gradeName} · ${r.sectionName}`,
        studentCount: r.studentCount,
        sessionStatus: r.sessionStatus,
      })),
      [
        {
          sectionId: "sec-a",
          label: "Grade 1 · A",
          studentCount: 1,
          sessionStatus: "draft",
        },
        {
          sectionId: "sec-b",
          label: "Grade 1 · B",
          studentCount: 1,
          sessionStatus: "not_started",
        },
        {
          sectionId: "sec-empty",
          label: "Grade 2 · A",
          studentCount: 0,
          sessionStatus: "not_started",
        },
      ],
    );
  });
});
