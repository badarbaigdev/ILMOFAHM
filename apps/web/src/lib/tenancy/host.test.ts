import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hostnameFromHostHeader,
  isValidSchoolSlug,
  mapAdminPathname,
  mapSchoolPathname,
  resolveHostSurface,
  surfaceOrigin,
} from "./host";

describe("hostnameFromHostHeader", () => {
  it("strips port", () => {
    assert.equal(hostnameFromHostHeader("Admin.Example.com:3000"), "admin.example.com");
  });
});

describe("isValidSchoolSlug", () => {
  it("accepts provisioned-style slugs and rejects reserved", () => {
    assert.equal(isValidSchoolSlug("greenfield-academy"), true);
    assert.equal(isValidSchoolSlug("admin"), false);
    assert.equal(isValidSchoolSlug("WWW"), false);
  });
});

describe("resolveHostSurface", () => {
  it("uses path mode when root domain is unset", () => {
    assert.deepEqual(resolveHostSurface("anything.com", undefined), {
      kind: "path",
    });
  });

  it("maps apex, www, admin, and school hosts", () => {
    assert.deepEqual(resolveHostSurface("ilmofahm.com", "ilmofahm.com"), {
      kind: "marketing",
      hostname: "ilmofahm.com",
    });
    assert.deepEqual(resolveHostSurface("www.ilmofahm.com", "ilmofahm.com"), {
      kind: "www",
      canonicalHost: "ilmofahm.com",
    });
    assert.deepEqual(resolveHostSurface("admin.ilmofahm.com", "ilmofahm.com"), {
      kind: "admin",
      hostname: "admin.ilmofahm.com",
    });
    assert.deepEqual(
      resolveHostSurface("greenfield.ilmofahm.com", "ilmofahm.com"),
      {
        kind: "school",
        hostname: "greenfield.ilmofahm.com",
        slug: "greenfield",
      },
    );
  });

  it("falls back to path mode for unrelated hosts (e.g. vercel previews)", () => {
    assert.deepEqual(
      resolveHostSurface("ilmofahm-git-develop.vercel.app", "ilmofahm.com"),
      { kind: "path" },
    );
  });

  it("rejects reserved subdomains as school portals", () => {
    assert.deepEqual(resolveHostSurface("api.ilmofahm.com", "ilmofahm.com"), {
      kind: "unknown",
      hostname: "api.ilmofahm.com",
    });
  });
});

describe("path mappers", () => {
  it("maps admin and school public paths", () => {
    assert.equal(mapAdminPathname("/"), "/platform");
    assert.equal(mapAdminPathname("/schools"), "/platform/schools");
    assert.equal(mapAdminPathname("/platform/plans"), "/platform/plans");
    assert.equal(mapAdminPathname("/auth/sign-in"), "/auth/sign-in");

    assert.equal(mapSchoolPathname("/"), "/school");
    assert.equal(mapSchoolPathname("/students"), "/school/students");
    assert.equal(mapSchoolPathname("/school/setup"), "/school/setup");
    assert.equal(mapSchoolPathname("/auth/sign-in"), "/auth/sign-in");
  });
});

describe("surfaceOrigin", () => {
  it("builds origins", () => {
    assert.equal(
      surfaceOrigin("https", "ilmofahm.com", "marketing"),
      "https://ilmofahm.com",
    );
    assert.equal(
      surfaceOrigin("https", "ilmofahm.com", "admin"),
      "https://admin.ilmofahm.com",
    );
    assert.equal(
      surfaceOrigin("https", "ilmofahm.com", "school", "greenfield"),
      "https://greenfield.ilmofahm.com",
    );
  });
});
