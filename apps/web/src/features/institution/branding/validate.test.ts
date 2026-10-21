import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCampusBrandingOverrideInput,
  validateOrganizationBrandingInput,
} from "./validate";

describe("validateOrganizationBrandingInput", () => {
  it("accepts contact and branding fields", () => {
    const result = validateOrganizationBrandingInput({
      contactEmail: " Office@School.Example.Test ",
      contactPhone: " +92-21-1 ",
      websiteUrl: "https://school.example.test",
      brandDisplayName: " School Brand ",
      brandPrimaryColor: "#0f766e",
      brandLogoUrl: "https://cdn.example.test/logo.png",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.contactEmail, "office@school.example.test");
      assert.equal(result.value.brandPrimaryColor, "#0F766E");
    }
  });

  it("rejects invalid email, color, and logo schemes", () => {
    assert.equal(
      validateOrganizationBrandingInput({ contactEmail: "bad" }).ok,
      false,
    );
    assert.equal(
      validateOrganizationBrandingInput({ brandPrimaryColor: "teal" }).ok,
      false,
    );
    assert.equal(
      validateOrganizationBrandingInput({
        brandLogoUrl: "http://insecure.example.test/logo.png",
      }).ok,
      false,
    );
  });
});

describe("validateCampusBrandingOverrideInput", () => {
  it("allows clearing overrides with blank values", () => {
    const result = validateCampusBrandingOverrideInput({
      brandDisplayName: " ",
      brandPrimaryColor: "",
      brandLogoUrl: "",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        brandDisplayName: null,
        brandPrimaryColor: null,
        brandLogoUrl: null,
      });
    }
  });
});
