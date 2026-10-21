import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateCohortInput, validateCourseInput } from "./validate";

describe("academy structure validation", () => {
  it("accepts a valid course", () => {
    const result = validateCourseInput({
      name: "Quran Memorization",
      code: "QM",
      description: "Hifz track",
    });
    assert.equal(result.ok, true);
  });

  it("accepts cohort without dates", () => {
    const result = validateCohortInput({
      name: "Batch A",
      startsOn: "",
      endsOn: "",
      capacity: "25",
      status: "planned",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.capacity, 25);
      assert.equal(result.value.startsOn, null);
    }
  });

  it("rejects inverted cohort dates", () => {
    assert.equal(
      validateCohortInput({
        name: "Batch A",
        startsOn: "2027-01-01",
        endsOn: "2026-01-01",
        capacity: "",
        status: "active",
      }).ok,
      false,
    );
  });
});
