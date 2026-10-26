import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countAttendanceStatuses,
  summarizeSchoolAttendanceDay,
} from "./summary";

describe("countAttendanceStatuses", () => {
  it("counts primary statuses including half_day", () => {
    const counts = countAttendanceStatuses([
      { status: "present" },
      { status: "present" },
      { status: "absent" },
      { status: "half_day" },
      { status: "late" },
    ]);
    assert.equal(counts.present, 2);
    assert.equal(counts.absent, 1);
    assert.equal(counts.half_day, 1);
    assert.equal(counts.late, 1);
    assert.equal(counts.total, 5);
  });
});

describe("summarizeSchoolAttendanceDay", () => {
  it("summarizes draft/submitted sessions and present rate", () => {
    const summary = summarizeSchoolAttendanceDay({
      date: "2026-10-26",
      sessions: [
        { status: "draft", attendanceDate: "2026-10-26" },
        { status: "submitted", attendanceDate: "2026-10-26" },
        { status: "draft", attendanceDate: "2026-10-25" },
      ],
      marks: [
        { status: "present" },
        { status: "late" },
        { status: "absent" },
        { status: "half_day" },
      ],
    });
    assert.equal(summary.draftSessions, 1);
    assert.equal(summary.submittedSessions, 1);
    assert.equal(summary.markedStudents, 4);
    assert.equal(summary.presentRate, 75);
  });
});
