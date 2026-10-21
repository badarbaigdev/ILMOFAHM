/**
 * Server-side validation and normalization for public school applications.
 * Never trust client-only checks; privileged approval fields are never accepted.
 */

export type SchoolApplicationInput = {
  schoolName: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  city: string;
  institutionType: string;
  message: string;
  /** Honeypot — must be empty. */
  website: string;
};

export type NormalizedSchoolApplication = {
  schoolName: string;
  applicantName: string;
  applicantEmail: string;
  phone: string | null;
  city: string;
  institutionType: "school" | "academy" | "both";
  message: string | null;
  countryCode: "PK";
};

export type SchoolApplicationValidationResult =
  | { ok: true; value: NormalizedSchoolApplication }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTION_TYPES = new Set(["school", "academy", "both"]);

function trim(value: unknown): string {
  return String(value ?? "").trim();
}

export function validateSchoolApplicationInput(
  raw: SchoolApplicationInput,
): SchoolApplicationValidationResult {
  const fieldErrors: Record<string, string> = {};

  // Bots that fill hidden fields are rejected without revealing the trap.
  if (trim(raw.website).length > 0) {
    return {
      ok: false,
      error: "Could not submit the application. Please try again.",
      fieldErrors: {},
    };
  }

  const schoolName = trim(raw.schoolName);
  const applicantName = trim(raw.applicantName);
  const applicantEmail = trim(raw.applicantEmail).toLowerCase();
  const phone = trim(raw.phone);
  const city = trim(raw.city);
  const institutionType = trim(raw.institutionType);
  const message = trim(raw.message);

  if (schoolName.length < 2) {
    fieldErrors.schoolName = "School name must be at least 2 characters.";
  } else if (schoolName.length > 200) {
    fieldErrors.schoolName = "School name is too long.";
  }

  if (applicantName.length < 2) {
    fieldErrors.applicantName = "Your name must be at least 2 characters.";
  } else if (applicantName.length > 120) {
    fieldErrors.applicantName = "Name is too long.";
  }

  if (!applicantEmail || !EMAIL_PATTERN.test(applicantEmail)) {
    fieldErrors.applicantEmail = "Enter a valid email address.";
  } else if (applicantEmail.length > 254) {
    fieldErrors.applicantEmail = "Email is too long.";
  }

  if (city.length < 2) {
    fieldErrors.city = "City must be at least 2 characters.";
  } else if (city.length > 120) {
    fieldErrors.city = "City is too long.";
  }

  if (!INSTITUTION_TYPES.has(institutionType)) {
    fieldErrors.institutionType = "Select an institution type.";
  }

  if (phone && phone.length < 7) {
    fieldErrors.phone = "Enter a valid phone number or leave it blank.";
  } else if (phone.length > 40) {
    fieldErrors.phone = "Phone number is too long.";
  }

  if (message.length > 2000) {
    fieldErrors.message = "Additional details are too long.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      schoolName,
      applicantName,
      applicantEmail,
      phone: phone || null,
      city,
      institutionType: institutionType as "school" | "academy" | "both",
      message: message || null,
      countryCode: "PK",
    },
  };
}

export function schoolApplicationFromFormData(
  formData: FormData,
): SchoolApplicationInput {
  return {
    schoolName: String(formData.get("schoolName") ?? ""),
    applicantName: String(formData.get("applicantName") ?? ""),
    applicantEmail: String(formData.get("applicantEmail") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    institutionType: String(formData.get("institutionType") ?? ""),
    message: String(formData.get("message") ?? ""),
    website: String(formData.get("website") ?? ""),
  };
}
