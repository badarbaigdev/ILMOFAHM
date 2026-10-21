import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateAcademicTermInput,
  validateAcademicYearInput,
} from "./validate";

describe("validateAcademicYearInput", () => {
  it("accepts a valid year", () => {
    const result = validateAcademicYearInput({
      name: "2026-27",
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
      status: "planned",
      makeCurrent: true,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.makeCurrent, true);
    }
  });

  it("rejects inverted dates", () => {
    const result = validateAcademicYearInput({
      name: "2026-27",
      startsOn: "2027-04-01",
      endsOn: "2026-03-31",
      status: "active",
    });
    assert.equal(result.ok, false);
  });

  it("rejects blank name", () => {
    const result = validateAcademicYearInput({
      name: "  ",
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
      status: "planned",
    });
    assert.equal(result.ok, false);
  });

  it("rejects invalid status", () => {
    const result = validateAcademicYearInput({
      name: "2026-27",
      startsOn: "2026-04-01",
      endsOn: "2027-03-31",
      status: "open",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateAcademicTermInput", () => {
  it("accepts a valid term", () => {
    const result = validateAcademicTermInput({
      name: "Term 1",
      startsOn: "2026-04-01",
      endsOn: "2026-08-31",
      sortOrder: "1",
    });
    assert.equal(result.ok, true);
  });

  it("rejects sort order below 1", () => {
    const result = validateAcademicTermInput({
      name: "Term 1",
      startsOn: "2026-04-01",
      endsOn: "2026-08-31",
      sortOrder: 0,
    });
    assert.equal(result.ok, false);
  });
});
