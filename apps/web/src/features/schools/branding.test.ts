import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { schoolBrandLogoUrl, schoolBrandName } from "./branding";

describe("school branding helpers", () => {
  it("prefers brand display name when set", () => {
    assert.equal(
      schoolBrandName({
        name: "Legal School Name",
        brandDisplayName: "Campus Brand",
      }),
      "Campus Brand",
    );
  });

  it("falls back to school name", () => {
    assert.equal(
      schoolBrandName({ name: "Legal School Name", brandDisplayName: null }),
      "Legal School Name",
    );
  });

  it("returns trimmed logo URL or null", () => {
    assert.equal(
      schoolBrandLogoUrl({ brandLogoUrl: " https://cdn.example/logo.png " }),
      "https://cdn.example/logo.png",
    );
    assert.equal(schoolBrandLogoUrl({ brandLogoUrl: null }), null);
    assert.equal(schoolBrandLogoUrl({ brandLogoUrl: "   " }), null);
  });
});
