import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractConfigChangeSnapshot, summarizeConfigFields } from "./format";

describe("extractConfigChangeSnapshot", () => {
  it("reads before/after and defaults effectiveAt to createdAt", () => {
    const snapshot = extractConfigChangeSnapshot(
      {
        before: { name: "A" },
        after: { name: "B" },
      },
      "2026-10-21T10:00:00.000Z",
    );
    assert.deepEqual(snapshot.before, { name: "A" });
    assert.deepEqual(snapshot.after, { name: "B" });
    assert.equal(snapshot.effectiveAt, "2026-10-21T10:00:00.000Z");
  });

  it("prefers metadata.effective_at when present", () => {
    const snapshot = extractConfigChangeSnapshot(
      {
        before: { locale: "en" },
        after: { locale: "ur" },
        effective_at: "2026-11-01T00:00:00.000Z",
      },
      "2026-10-21T10:00:00.000Z",
    );
    assert.equal(snapshot.effectiveAt, "2026-11-01T00:00:00.000Z");
  });
});

describe("summarizeConfigFields", () => {
  it("formats empty and array values", () => {
    assert.equal(summarizeConfigFields(null), "—");
    assert.match(
      summarizeConfigFields({ working_days: [1, 2, 3], phone: null }),
      /working_days: \[1, 2, 3\]/,
    );
    assert.match(
      summarizeConfigFields({ working_days: [1, 2, 3], phone: null }),
      /phone: \(empty\)/,
    );
  });
});
