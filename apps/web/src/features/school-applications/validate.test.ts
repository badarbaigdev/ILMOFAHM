import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  schoolApplicationFromFormData,
  validateSchoolApplicationInput,
} from "./validate";

describe("validateSchoolApplicationInput", () => {
  const valid = {
    schoolName: "Green Valley School",
    applicantName: "Sara Ahmed",
    applicantEmail: "Sara@Example.com",
    phone: "+92 300 1234567",
    city: "Lahore",
    institutionType: "school",
    message: "Looking to digitize attendance.",
    website: "",
  };

  it("normalizes a valid application", () => {
    const result = validateSchoolApplicationInput(valid);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.applicantEmail, "sara@example.com");
    assert.equal(result.value.schoolName, "Green Valley School");
    assert.equal(result.value.countryCode, "PK");
  });

  it("rejects invalid email and missing type", () => {
    const result = validateSchoolApplicationInput({
      ...valid,
      applicantEmail: "not-an-email",
      institutionType: "",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.fieldErrors.applicantEmail);
    assert.ok(result.fieldErrors.institutionType);
  });

  it("rejects honeypot fills without field details", () => {
    const result = validateSchoolApplicationInput({
      ...valid,
      website: "http://spam.example",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.fieldErrors, {});
  });

  it("does not accept approval-like fields from form data helpers", () => {
    const formData = new FormData();
    formData.set("schoolName", "Test School");
    formData.set("applicantName", "Ali");
    formData.set("applicantEmail", "ali@example.com");
    formData.set("city", "Karachi");
    formData.set("institutionType", "academy");
    formData.set("status", "approved");
    formData.set("reviewer_user_id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    const parsed = schoolApplicationFromFormData(formData);
    assert.equal("status" in parsed, false);
    const result = validateSchoolApplicationInput({
      ...parsed,
      phone: "",
      message: "",
      website: "",
    });
    assert.equal(result.ok, true);
  });
});
