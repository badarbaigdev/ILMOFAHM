import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthCallbackUrl,
  defaultPostAuthPath,
  safeAuthNextPath,
} from "./paths";

describe("safeAuthNextPath", () => {
  it("allows internal app and platform paths", () => {
    assert.equal(safeAuthNextPath("/app"), "/app");
    assert.equal(safeAuthNextPath("/app/settings"), "/app/settings");
    assert.equal(safeAuthNextPath("/platform"), "/platform");
    assert.equal(
      safeAuthNextPath("/platform/organizations"),
      "/platform/organizations",
    );
  });

  it("rejects open redirects and auth loops", () => {
    assert.equal(safeAuthNextPath("https://evil.example"), "/app");
    assert.equal(safeAuthNextPath("//evil.example"), "/app");
    assert.equal(safeAuthNextPath("/auth/sign-in"), "/app");
    assert.equal(safeAuthNextPath(null), "/app");
    assert.equal(safeAuthNextPath("/evil"), "/app");
  });

  it("allows the password-update recovery path", () => {
    assert.equal(
      safeAuthNextPath("/auth/update-password"),
      "/auth/update-password",
    );
  });
});

describe("defaultPostAuthPath", () => {
  it("sends platform operators to /platform", () => {
    assert.equal(defaultPostAuthPath(true), "/platform");
    assert.equal(defaultPostAuthPath(false), "/app");
  });
});

describe("buildAuthCallbackUrl", () => {
  it("builds a callback URL with a safe next path", () => {
    assert.equal(
      buildAuthCallbackUrl("http://127.0.0.1:3000", "/app"),
      "http://127.0.0.1:3000/auth/callback?next=%2Fapp",
    );
  });
});
