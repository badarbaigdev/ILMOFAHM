export type GuardianRelationship =
  | "mother"
  | "father"
  | "guardian"
  | "grandparent"
  | "sibling"
  | "other";

export type GuardianInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

export type GuardianLinkInput = {
  studentId: string;
  guardianId: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const RELATIONSHIPS: readonly GuardianRelationship[] = [
  "mother",
  "father",
  "guardian",
  "grandparent",
  "sibling",
  "other",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateGuardianInput(raw: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): ValidateResult<GuardianInput> {
  const firstName = raw.firstName.trim();
  const lastName = raw.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "First and last name are required." };
  }
  if (firstName.length > 120 || lastName.length > 120) {
    return { ok: false, error: "Names must be 120 characters or fewer." };
  }

  const emailRaw = raw.email.trim().toLowerCase();
  let email: string | null = null;
  if (emailRaw) {
    if (!EMAIL_RE.test(emailRaw)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    email = emailRaw;
  }

  const phone = raw.phone.trim() || null;
  if (phone && phone.length > 40) {
    return { ok: false, error: "Phone must be 40 characters or fewer." };
  }

  return { ok: true, value: { firstName, lastName, email, phone } };
}

export function validateGuardianLinkInput(raw: {
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary?: boolean;
}): ValidateResult<GuardianLinkInput> {
  const studentId = raw.studentId.trim();
  const guardianId = raw.guardianId.trim();
  if (!UUID_RE.test(studentId) || !UUID_RE.test(guardianId)) {
    return { ok: false, error: "Student and guardian are required." };
  }
  const relationship = raw.relationship.trim() as GuardianRelationship;
  if (!RELATIONSHIPS.includes(relationship)) {
    return { ok: false, error: "Select a valid relationship." };
  }
  return {
    ok: true,
    value: {
      studentId,
      guardianId,
      relationship,
      isPrimary: Boolean(raw.isPrimary),
    },
  };
}
