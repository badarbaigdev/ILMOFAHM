import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEffectiveBranding } from "./resolve";

describe("resolveEffectiveBranding", () => {
  const org = {
    name: "School A",
    brandDisplayName: "School A Brand",
    brandPrimaryColor: "#0F766E",
    brandLogoUrl: "https://cdn.example.test/org.png",
  };

  it("uses organization branding when campus has no overrides", () => {
    const effective = resolveEffectiveBranding(org, {
      brandDisplayName: null,
      brandPrimaryColor: null,
      brandLogoUrl: null,
    });
    assert.deepEqual(effective, {
      displayName: "School A Brand",
      primaryColor: "#0F766E",
      logoUrl: "https://cdn.example.test/org.png",
      inheritedFromOrganization: true,
    });
  });

  it("applies campus overrides when present", () => {
    const effective = resolveEffectiveBranding(org, {
      brandDisplayName: "Campus Brand",
      brandPrimaryColor: null,
      brandLogoUrl: "https://cdn.example.test/campus.png",
    });
    assert.equal(effective.displayName, "Campus Brand");
    assert.equal(effective.primaryColor, "#0F766E");
    assert.equal(effective.logoUrl, "https://cdn.example.test/campus.png");
    assert.equal(effective.inheritedFromOrganization, false);
  });

  it("falls back to organization name when no display name is set", () => {
    const effective = resolveEffectiveBranding({
      name: "School A",
      brandDisplayName: null,
      brandPrimaryColor: null,
      brandLogoUrl: null,
    });
    assert.equal(effective.displayName, "School A");
  });
});
