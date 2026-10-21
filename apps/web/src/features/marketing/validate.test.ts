import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateContactForm,
  validateDemoForm,
  validateRegisterSchoolForm,
} from "./validate";

describe("validateContactForm", () => {
  it("rejects empty required fields", () => {
    const errors = validateContactForm({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
    assert.ok(errors.name);
    assert.ok(errors.email);
    assert.ok(errors.subject);
    assert.ok(errors.message);
  });

  it("accepts a complete message", () => {
    const errors = validateContactForm({
      name: "Ayesha Khan",
      email: "ayesha@example.com",
      subject: "Partnership",
      message: "We would like to learn more about ILMOFAHM.",
    });
    assert.deepEqual(errors, {});
  });
});

describe("validateDemoForm", () => {
  it("requires school name and email", () => {
    const errors = validateDemoForm({
      name: "Ali",
      email: "not-an-email",
      schoolName: "",
      phone: "",
      preferredTime: "",
      notes: "",
    });
    assert.ok(errors.email);
    assert.ok(errors.schoolName);
  });
});

describe("validateRegisterSchoolForm", () => {
  it("requires a valid institution type", () => {
    const errors = validateRegisterSchoolForm({
      schoolName: "Green Valley School",
      applicantName: "Sara Ahmed",
      applicantEmail: "sara@example.com",
      phone: "",
      city: "Lahore",
      institutionType: "",
      message: "",
    });
    assert.ok(errors.institutionType);
  });

  it("accepts a valid application payload", () => {
    const errors = validateRegisterSchoolForm({
      schoolName: "Green Valley School",
      applicantName: "Sara Ahmed",
      applicantEmail: "sara@example.com",
      phone: "+92 300 1234567",
      city: "Lahore",
      institutionType: "school",
      message: "Looking to digitize attendance and fees.",
    });
    assert.deepEqual(errors, {});
  });
});
