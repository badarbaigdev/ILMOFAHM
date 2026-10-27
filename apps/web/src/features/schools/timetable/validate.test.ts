import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findTimetableConflict,
  timesOverlap,
  validateTimetableEntryInput,
} from "./validate";

describe("timesOverlap", () => {
  it("detects overlapping and adjacent slots", () => {
    assert.equal(timesOverlap("08:00", "09:00", "08:30", "09:30"), true);
    assert.equal(timesOverlap("08:00", "09:00", "09:00", "10:00"), false);
    assert.equal(timesOverlap("08:00", "09:00", "07:00", "08:00"), false);
  });
});

describe("validateTimetableEntryInput", () => {
  const base = {
    sectionId: "11111111-1111-4111-8111-111111111111",
    subjectId: "22222222-2222-4222-8222-222222222222",
    teacherId: "33333333-3333-4333-8333-333333333333",
    roomId: "",
    dayOfWeek: "1",
    startsAt: "08:00",
    endsAt: "08:45",
    notes: "",
  };

  it("accepts a valid period", () => {
    const result = validateTimetableEntryInput(base);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.dayOfWeek, 1);
      assert.equal(result.value.startsAt, "08:00");
      assert.equal(result.value.roomId, null);
    }
  });

  it("rejects inverted times", () => {
    const result = validateTimetableEntryInput({
      ...base,
      startsAt: "09:00",
      endsAt: "08:00",
    });
    assert.equal(result.ok, false);
  });
});

describe("findTimetableConflict", () => {
  const existing = [
    {
      id: "a",
      sectionId: "sec1",
      teacherId: "t1",
      roomId: "r1",
      dayOfWeek: 1,
      startsAt: "08:00",
      endsAt: "09:00",
      status: "active",
    },
  ];

  it("flags teacher, section, and room conflicts", () => {
    assert.equal(
      findTimetableConflict(existing, {
        sectionId: "sec2",
        teacherId: "t1",
        roomId: null,
        dayOfWeek: 1,
        startsAt: "08:30",
        endsAt: "09:30",
      }),
      "teacher",
    );
    assert.equal(
      findTimetableConflict(existing, {
        sectionId: "sec1",
        teacherId: "t2",
        roomId: null,
        dayOfWeek: 1,
        startsAt: "08:30",
        endsAt: "09:30",
      }),
      "section",
    );
    assert.equal(
      findTimetableConflict(existing, {
        sectionId: "sec2",
        teacherId: "t2",
        roomId: "r1",
        dayOfWeek: 1,
        startsAt: "08:30",
        endsAt: "09:30",
      }),
      "room",
    );
  });

  it("ignores self when updating", () => {
    assert.equal(
      findTimetableConflict(existing, {
        id: "a",
        sectionId: "sec1",
        teacherId: "t1",
        roomId: "r1",
        dayOfWeek: 1,
        startsAt: "08:00",
        endsAt: "09:00",
      }),
      null,
    );
  });
});
