/**
 * Client-side validation for public marketing forms.
 * Server-side validation will be added when backends land (Phases 4+).
 */

export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

function email(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

function minLength(value: string, label: string, min: number): string | null {
  if (value.trim().length < min) {
    return `${label} must be at least ${min} characters.`;
  }
  return null;
}

export type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export function validateContactForm(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const nameErr =
    required(values.name, "Name") ?? minLength(values.name, "Name", 2);
  if (nameErr) errors.name = nameErr;
  const emailErr = email(values.email);
  if (emailErr) errors.email = emailErr;
  const subjectErr =
    required(values.subject, "Subject") ??
    minLength(values.subject, "Subject", 3);
  if (subjectErr) errors.subject = subjectErr;
  const messageErr =
    required(values.message, "Message") ??
    minLength(values.message, "Message", 10);
  if (messageErr) errors.message = messageErr;
  return errors;
}

export type DemoFormValues = {
  name: string;
  email: string;
  schoolName: string;
  phone: string;
  preferredTime: string;
  notes: string;
};

export function validateDemoForm(values: DemoFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const nameErr =
    required(values.name, "Name") ?? minLength(values.name, "Name", 2);
  if (nameErr) errors.name = nameErr;
  const emailErr = email(values.email);
  if (emailErr) errors.email = emailErr;
  const schoolErr =
    required(values.schoolName, "School name") ??
    minLength(values.schoolName, "School name", 2);
  if (schoolErr) errors.schoolName = schoolErr;
  if (values.phone.trim() && values.phone.trim().length < 7) {
    errors.phone = "Enter a valid phone number or leave it blank.";
  }
  return errors;
}

export type RegisterSchoolFormValues = {
  schoolName: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  city: string;
  institutionType: string;
  message: string;
};

const INSTITUTION_TYPES = new Set(["school", "academy", "both"]);

export function validateRegisterSchoolForm(
  values: RegisterSchoolFormValues,
): FieldErrors {
  const errors: FieldErrors = {};
  const schoolErr =
    required(values.schoolName, "School name") ??
    minLength(values.schoolName, "School name", 2);
  if (schoolErr) errors.schoolName = schoolErr;
  const applicantErr =
    required(values.applicantName, "Your name") ??
    minLength(values.applicantName, "Your name", 2);
  if (applicantErr) errors.applicantName = applicantErr;
  const emailErr = email(values.applicantEmail);
  if (emailErr) errors.applicantEmail = emailErr;
  const cityErr =
    required(values.city, "City") ?? minLength(values.city, "City", 2);
  if (cityErr) errors.city = cityErr;
  if (!INSTITUTION_TYPES.has(values.institutionType)) {
    errors.institutionType = "Select an institution type.";
  }
  if (values.phone.trim() && values.phone.trim().length < 7) {
    errors.phone = "Enter a valid phone number or leave it blank.";
  }
  return errors;
}
