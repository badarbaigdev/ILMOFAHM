import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { brand } from "./brand";

describe("brand", () => {
  it("uses the canonical product name exactly", () => {
    assert.equal(brand.productName, "ILMOFAHM");
  });

  it("keeps the institutional label uppercase and verbatim", () => {
    assert.equal(brand.institutionalLabel, "INSTITUTIONAL TECHNOLOGY");
  });

  it("includes the trailing period in the tagline", () => {
    assert.equal(brand.tagline, "One system. Every institution.");
    assert.equal(brand.tagline.endsWith("."), true);
  });

  it("exposes the approved product descriptor", () => {
    assert.equal(
      brand.descriptor,
      "Centralized school and academy management, designed for complete institutional visibility.",
    );
  });
});
