import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSchoolInviteAcceptUrl,
  defaultPostAuthPath,
  safeAuthNextPath,
} from "./paths";

describe("safeAuthNextPath", () => {
  it("allows platform and school paths; remaps legacy /app", () => {
    assert.equal(safeAuthNextPath("/app"), "/school");
    assert.equal(safeAuthNextPath("/app/settings"), "/school");
    assert.equal(safeAuthNextPath("/platform"), "/platform");
    assert.equal(
      safeAuthNextPath("/platform/organizations"),
      "/platform/schools",
    );
    assert.equal(safeAuthNextPath("/school"), "/school");
    assert.equal(
      safeAuthNextPath("/school?school=abc"),
      "/school?school=abc",
    );
  });

  it("rejects open redirects and auth loops", () => {
    assert.equal(safeAuthNextPath("https://evil.example"), "/school");
    assert.equal(safeAuthNextPath("//evil.example"), "/school");
    assert.equal(safeAuthNextPath("/auth/sign-in"), "/school");
    assert.equal(safeAuthNextPath(null), "/school");
    assert.equal(safeAuthNextPath("/evil"), "/school");
  });

  it("allows password-update and invitation accept paths", () => {
    assert.equal(
      safeAuthNextPath("/auth/update-password"),
      "/auth/update-password",
    );
    assert.equal(
      safeAuthNextPath("/auth/accept-school-invite?token=xyz"),
      "/auth/accept-school-invite?token=xyz",
    );
  });
});

describe("defaultPostAuthPath", () => {
  it("sends platform operators to /platform and others to /school", () => {
    assert.equal(defaultPostAuthPath(true), "/platform");
    assert.equal(defaultPostAuthPath(false), "/school");
  });
});

describe("buildSchoolInviteAcceptUrl", () => {
  it("builds an accept URL with the token query param", () => {
    assert.equal(
      buildSchoolInviteAcceptUrl("http://localhost:3000", "tokensecret"),
      "http://localhost:3000/auth/accept-school-invite?token=tokensecret",
    );
  });
});
