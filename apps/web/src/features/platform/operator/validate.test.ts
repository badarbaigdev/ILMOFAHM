import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validatePlatformCreateOrganizationInput } from "./validate";

describe("validatePlatformCreateOrganizationInput", () => {
  it("accepts a complete create payload", () => {
    const result = validatePlatformCreateOrganizationInput({
      name: "Green Valley School",
      institutionType: "school",
      slug: "green-valley",
      campusName: "Main",
      adminEmail: "admin@example.test",
      adminFullName: "Ada Admin",
      adminPassword: "password123",
    });
    assert.equal(result.ok, true);
  });

  it("rejects invalid admin email", () => {
    const result = validatePlatformCreateOrganizationInput({
      name: "Green Valley School",
      institutionType: "school",
      slug: "",
      campusName: "",
      adminEmail: "not-an-email",
      adminFullName: "",
      adminPassword: "",
    });
    assert.equal(result.ok, false);
  });

  it("rejects short passwords when provided", () => {
    const result = validatePlatformCreateOrganizationInput({
      name: "Green Valley School",
      institutionType: "academy",
      slug: "",
      campusName: "",
      adminEmail: "admin@example.test",
      adminFullName: "",
      adminPassword: "short",
    });
    assert.equal(result.ok, false);
  });
});
