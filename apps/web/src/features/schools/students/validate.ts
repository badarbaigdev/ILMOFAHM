export type StudentGender = "female" | "male" | "other" | "unspecified";

export type StudentInput = {
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
};

export type EnrolmentInput = {
  studentId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string | null;
  enrolledOn: string;
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const GENDERS: readonly StudentGender[] = [
  "female",
  "male",
  "other",
  "unspecified",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

export function validateStudentInput(raw: {
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
}): ValidateResult<StudentInput> {
  const studentNumber = raw.studentNumber.trim();
  if (!studentNumber) {
    return { ok: false, error: "Student number is required." };
  }
  if (studentNumber.length > 64) {
    return { ok: false, error: "Student number must be 64 characters or fewer." };
  }

  const firstName = raw.firstName.trim();
  const lastName = raw.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "First and last name are required." };
  }
  if (firstName.length > 120 || lastName.length > 120) {
    return { ok: false, error: "Names must be 120 characters or fewer." };
  }

  const dobRaw = raw.dateOfBirth.trim();
  let dateOfBirth: string | null = null;
  if (dobRaw) {
    if (!parseDate(dobRaw)) {
      return { ok: false, error: "Enter a valid date of birth (YYYY-MM-DD)." };
    }
    dateOfBirth = dobRaw;
  }

  const genderRaw = raw.gender.trim();
  let gender: StudentGender | null = null;
  if (genderRaw) {
    if (!GENDERS.includes(genderRaw as StudentGender)) {
      return { ok: false, error: "Select a valid gender option." };
    }
    gender = genderRaw as StudentGender;
  }

  return {
    ok: true,
    value: { studentNumber, firstName, lastName, dateOfBirth, gender },
  };
}

export function validateEnrolmentInput(raw: {
  studentId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string;
  enrolledOn: string;
}): ValidateResult<EnrolmentInput> {
  const studentId = raw.studentId.trim();
  const academicYearId = raw.academicYearId.trim();
  const gradeId = raw.gradeId.trim();
  if (!UUID_RE.test(studentId) || !UUID_RE.test(academicYearId) || !UUID_RE.test(gradeId)) {
    return {
      ok: false,
      error: "Student, academic year, and grade are required.",
    };
  }

  const sectionRaw = raw.sectionId.trim();
  const sectionId = sectionRaw
    ? UUID_RE.test(sectionRaw)
      ? sectionRaw
      : null
    : null;
  if (sectionRaw && !sectionId) {
    return { ok: false, error: "Select a valid section." };
  }

  const enrolledOn = raw.enrolledOn.trim() || new Date().toISOString().slice(0, 10);
  if (!parseDate(enrolledOn)) {
    return { ok: false, error: "Enter a valid enrolment date (YYYY-MM-DD)." };
  }

  return {
    ok: true,
    value: { studentId, academicYearId, gradeId, sectionId, enrolledOn },
  };
}
