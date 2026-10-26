export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "leave";

export type AttendanceMarkInput = {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
};

export type OpenAttendanceInput = {
  schoolId: string;
  sectionId: string;
  attendanceDate: string;
};

export type CorrectAttendanceInput = {
  markId: string;
  status: AttendanceStatus;
  reason: string;
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "excused",
  "leave",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateOpenAttendanceInput(raw: {
  schoolId: string;
  sectionId: string;
  attendanceDate: string;
}): ValidateResult<OpenAttendanceInput> {
  const schoolId = raw.schoolId.trim();
  const sectionId = raw.sectionId.trim();
  const attendanceDate = raw.attendanceDate.trim();
  if (!UUID_RE.test(schoolId) || !UUID_RE.test(sectionId)) {
    return { ok: false, error: "School and section are required." };
  }
  if (!DATE_RE.test(attendanceDate)) {
    return { ok: false, error: "Enter a valid attendance date." };
  }
  return { ok: true, value: { schoolId, sectionId, attendanceDate } };
}

export function validateAttendanceMarksInput(
  rawMarks: Array<{ studentId: string; status: string; note: string }>,
): ValidateResult<AttendanceMarkInput[]> {
  if (rawMarks.length === 0) {
    return { ok: false, error: "At least one mark is required." };
  }
  const marks: AttendanceMarkInput[] = [];
  for (const raw of rawMarks) {
    const studentId = raw.studentId.trim();
    if (!UUID_RE.test(studentId)) {
      return { ok: false, error: "Each mark needs a valid student." };
    }
    const status = raw.status.trim() as AttendanceStatus;
    if (!ATTENDANCE_STATUSES.includes(status)) {
      return { ok: false, error: "Select a valid attendance status." };
    }
    const note = raw.note.trim() || null;
    if (note && note.length > 500) {
      return { ok: false, error: "Notes must be 500 characters or fewer." };
    }
    marks.push({ studentId, status, note });
  }
  return { ok: true, value: marks };
}

export function validateCorrectAttendanceInput(raw: {
  markId: string;
  status: string;
  reason: string;
}): ValidateResult<CorrectAttendanceInput> {
  const markId = raw.markId.trim();
  if (!UUID_RE.test(markId)) {
    return { ok: false, error: "Mark is required." };
  }
  const status = raw.status.trim() as AttendanceStatus;
  if (!ATTENDANCE_STATUSES.includes(status)) {
    return { ok: false, error: "Select a valid attendance status." };
  }
  const reason = raw.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Enter a correction reason (at least 3 characters)." };
  }
  if (reason.length > 500) {
    return { ok: false, error: "Reason must be 500 characters or fewer." };
  }
  return { ok: true, value: { markId, status, reason } };
}
