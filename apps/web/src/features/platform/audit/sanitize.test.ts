import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeAuditMetadata } from "./sanitize";

describe("sanitizeAuditMetadata", () => {
  it("removes secret-like keys", () => {
    assert.deepEqual(
      sanitizeAuditMetadata({
        role: "teacher",
        password: "secret",
        access_token: "tok",
        api_key: "k",
      }),
      { role: "teacher" },
    );
  });

  it("redacts email values", () => {
    assert.deepEqual(
      sanitizeAuditMetadata({ email: "invitee@example.test", note: "ok" }),
      { email: "i***@example.test", note: "ok" },
    );
  });

  it("sanitizes nested objects", () => {
    assert.deepEqual(
      sanitizeAuditMetadata({
        nested: { token: "x", safe: true },
      }),
      { nested: { safe: true } },
    );
  });

  it("returns empty object for invalid input", () => {
    assert.deepEqual(sanitizeAuditMetadata(null), {});
    assert.deepEqual(sanitizeAuditMetadata(undefined), {});
  });
});
