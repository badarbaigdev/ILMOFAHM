import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRegistrationRateLimitKey,
  checkRateLimit,
  resetRateLimitBucketsForTests,
} from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows traffic under the limit and blocks after", () => {
    resetRateLimitBucketsForTests();
    const key = "test-key";
    const now = 1_000_000;

    assert.equal(
      checkRateLimit(key, { limit: 2, windowMs: 60_000, now }).allowed,
      true,
    );
    assert.equal(
      checkRateLimit(key, { limit: 2, windowMs: 60_000, now: now + 1 }).allowed,
      true,
    );
    const blocked = checkRateLimit(key, {
      limit: 2,
      windowMs: 60_000,
      now: now + 2,
    });
    assert.equal(blocked.allowed, false);
    if (blocked.allowed) return;
    assert.ok(blocked.retryAfterSeconds >= 1);
  });

  it("resets after the window", () => {
    resetRateLimitBucketsForTests();
    const key = "window-key";
    const now = 2_000_000;
    checkRateLimit(key, { limit: 1, windowMs: 1000, now });
    const afterWindow = checkRateLimit(key, {
      limit: 1,
      windowMs: 1000,
      now: now + 1001,
    });
    assert.equal(afterWindow.allowed, true);
  });
});

describe("buildRegistrationRateLimitKey", () => {
  it("normalizes email and includes ip", () => {
    assert.equal(
      buildRegistrationRateLimitKey({
        ip: "1.2.3.4",
        email: "Sara@Example.com",
      }),
      "school-application:1.2.3.4:sara@example.com",
    );
  });
});
