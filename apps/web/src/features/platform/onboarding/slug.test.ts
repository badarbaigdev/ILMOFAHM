import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidOrganizationSlug, slugifyOrganizationName } from "./slug";

describe("slugifyOrganizationName", () => {
  it("produces a lowercase hyphenated slug", () => {
    assert.equal(
      slugifyOrganizationName("Green Valley School"),
      "green-valley-school",
    );
  });

  it("strips punctuation and collapses separators", () => {
    assert.equal(
      slugifyOrganizationName("  Al-Noor!! Academy  "),
      "al-noor-academy",
    );
  });
});

describe("isValidOrganizationSlug", () => {
  it("accepts canonical slugs", () => {
    assert.equal(isValidOrganizationSlug("green-valley"), true);
  });

  it("rejects uppercase and leading hyphens", () => {
    assert.equal(isValidOrganizationSlug("Green"), false);
    assert.equal(isValidOrganizationSlug("-bad"), false);
  });
});
