import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  institutionTypeLabel,
  isInstitutionType,
  supportsAcademy,
  supportsSchool,
} from "./mode";

describe("institution mode", () => {
  it("validates institution types", () => {
    assert.equal(isInstitutionType("school"), true);
    assert.equal(isInstitutionType("academy"), true);
    assert.equal(isInstitutionType("both"), true);
    assert.equal(isInstitutionType("college"), false);
  });

  it("gates school workflows by operating mode", () => {
    assert.equal(supportsSchool("school"), true);
    assert.equal(supportsSchool("both"), true);
    assert.equal(supportsSchool("academy"), false);
  });

  it("gates academy workflows by operating mode", () => {
    assert.equal(supportsAcademy("academy"), true);
    assert.equal(supportsAcademy("both"), true);
    assert.equal(supportsAcademy("school"), false);
  });

  it("labels institution types for display", () => {
    assert.equal(institutionTypeLabel("both"), "School and academy");
  });
});
