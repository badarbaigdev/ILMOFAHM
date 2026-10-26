export type TeacherInput = {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  primarySubject: string | null;
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTeacherInput(raw: {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primarySubject: string;
}): ValidateResult<TeacherInput> {
  const staffNumber = raw.staffNumber.trim();
  if (!staffNumber) {
    return { ok: false, error: "Staff number is required." };
  }
  if (staffNumber.length > 64) {
    return { ok: false, error: "Staff number must be 64 characters or fewer." };
  }

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

  const primarySubject = raw.primarySubject.trim() || null;
  if (primarySubject && primarySubject.length > 120) {
    return { ok: false, error: "Subject must be 120 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      staffNumber,
      firstName,
      lastName,
      email,
      phone,
      primarySubject,
    },
  };
}

export function validateTeacherId(raw: string): ValidateResult<string> {
  const id = raw.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Teacher is required." };
  }
  return { ok: true, value: id };
}
