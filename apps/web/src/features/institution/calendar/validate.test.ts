import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateHolidayInput, validateLocaleSettingsInput } from "./validate";

describe("validateLocaleSettingsInput", () => {
  it("accepts curated timezone, locale, and working days", () => {
    const result = validateLocaleSettingsInput({
      timezone: "Asia/Karachi",
      locale: "ur",
      workingDays: [5, 1, 1, 2, 3, 4],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        timezone: "Asia/Karachi",
        locale: "ur",
        workingDays: [1, 2, 3, 4, 5],
      });
    }
  });

  it("rejects unsupported timezones", () => {
    const result = validateLocaleSettingsInput({
      timezone: "Mars/Phobos",
      locale: "en",
      workingDays: [1],
    });
    assert.equal(result.ok, false);
  });

  it("rejects empty working days", () => {
    const result = validateLocaleSettingsInput({
      timezone: "UTC",
      locale: "en",
      workingDays: [],
    });
    assert.equal(result.ok, false);
  });
});

describe("validateHolidayInput", () => {
  it("accepts a named date", () => {
    const result = validateHolidayInput({
      name: " Independence Day ",
      holidayDate: "2026-08-14",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        name: "Independence Day",
        holidayDate: "2026-08-14",
      });
    }
  });

  it("rejects blank names and bad dates", () => {
    assert.equal(
      validateHolidayInput({ name: " ", holidayDate: "2026-08-14" }).ok,
      false,
    );
    assert.equal(
      validateHolidayInput({ name: "Day", holidayDate: "14/08/2026" }).ok,
      false,
    );
  });
});
