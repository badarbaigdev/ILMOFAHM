import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { getHealthPayload } from "./health";

describe("getHealthPayload", () => {
  it("returns only non-sensitive operational fields", () => {
    const payload = getHealthPayload(
      () => new Date("2026-10-20T12:00:00.000Z"),
    );

    assert.deepEqual(payload, {
      status: "ok",
      service: "ilmofahm-web",
      timestamp: "2026-10-20T12:00:00.000Z",
    });

    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /SUPABASE/i);
    assert.doesNotMatch(serialized, /secret/i);
    assert.doesNotMatch(serialized, /postgres/i);
    assert.doesNotMatch(serialized, /127\.0\.0\.1/);
  });
});

describe("health route source", () => {
  it("does not read privileged environment variables", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/health/route.ts"),
      "utf8",
    );

    assert.match(source, /getHealthPayload/);
    assert.doesNotMatch(source, /process\.env/);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(source, /createServiceSupabaseClient/);
  });
});
