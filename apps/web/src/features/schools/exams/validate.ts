export const EXAM_TYPES = [
  { value: "monthly", label: "Monthly test" },
  { value: "midterm", label: "Midterm exam" },
  { value: "final", label: "Final exam" },
  { value: "annual", label: "Annual exam" },
  { value: "other", label: "Other" },
] as const;

export type ExamTypeValue = (typeof EXAM_TYPES)[number]["value"];

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function validateCreateExaminationInput(raw: {
  schoolId: string;
  academicYearId: string;
  academicTermId: string;
  name: string;
  examType: string;
  startsOn: string;
  endsOn: string;
  publishRanks: string;
}): ValidateResult<{
  schoolId: string;
  academicYearId: string;
  academicTermId: string | null;
  name: string;
  examType: ExamTypeValue;
  startsOn: string | null;
  endsOn: string | null;
  publishRanks: boolean;
}> {
  const schoolId = raw.schoolId.trim();
  const academicYearId = raw.academicYearId.trim();
  const academicTermId = raw.academicTermId.trim();
  const name = raw.name.trim();
  const examType = raw.examType.trim() as ExamTypeValue;
  const startsOn = raw.startsOn.trim();
  const endsOn = raw.endsOn.trim();

  if (!isUuid(schoolId)) return { ok: false, error: "School is required." };
  if (!isUuid(academicYearId)) {
    return { ok: false, error: "Select an academic session." };
  }
  if (academicTermId && !isUuid(academicTermId)) {
    return { ok: false, error: "Select a valid term." };
  }
  if (!name || name.length < 2) {
    return { ok: false, error: "Enter an examination name." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer." };
  }
  if (!EXAM_TYPES.some((t) => t.value === examType)) {
    return { ok: false, error: "Select a valid examination type." };
  }
  if (startsOn && endsOn && endsOn < startsOn) {
    return { ok: false, error: "End date must be on or after the start date." };
  }

  return {
    ok: true,
    value: {
      schoolId,
      academicYearId,
      academicTermId: academicTermId || null,
      name,
      examType,
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      publishRanks: raw.publishRanks === "on" || raw.publishRanks === "true",
    },
  };
}

export function validateExamPaperInput(raw: {
  examinationId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  maxMarks: string;
  passMarks: string;
}): ValidateResult<{
  examinationId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
}> {
  const examinationId = raw.examinationId.trim();
  const gradeId = raw.gradeId.trim();
  const sectionId = raw.sectionId.trim();
  const subjectId = raw.subjectId.trim();
  const maxMarks = Number(raw.maxMarks);
  const passMarks = Number(raw.passMarks);

  if (!isUuid(examinationId)) {
    return { ok: false, error: "Examination is required." };
  }
  if (!isUuid(gradeId)) return { ok: false, error: "Select a class." };
  if (!isUuid(sectionId)) return { ok: false, error: "Select a section." };
  if (!isUuid(subjectId)) return { ok: false, error: "Select a subject." };
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
    return { ok: false, error: "Maximum marks must be greater than zero." };
  }
  if (!Number.isFinite(passMarks) || passMarks < 0 || passMarks > maxMarks) {
    return {
      ok: false,
      error: "Passing marks must be between 0 and maximum marks.",
    };
  }

  return {
    ok: true,
    value: {
      examinationId,
      gradeId,
      sectionId,
      subjectId,
      maxMarks: Math.round(maxMarks * 100) / 100,
      passMarks: Math.round(passMarks * 100) / 100,
    },
  };
}

export function validateExamMarkInput(raw: {
  paperId: string;
  studentId: string;
  attendanceStatus: string;
  marksObtained: string;
  remarks: string;
  maxMarks: number;
}): ValidateResult<{
  paperId: string;
  studentId: string;
  attendanceStatus: "present" | "absent" | "exempt";
  marksObtained: number | null;
  remarks: string | null;
}> {
  const paperId = raw.paperId.trim();
  const studentId = raw.studentId.trim();
  const attendanceStatus = raw.attendanceStatus.trim() as
    | "present"
    | "absent"
    | "exempt";
  const remarks = raw.remarks.trim();
  const marksRaw = raw.marksObtained.trim();

  if (!isUuid(paperId)) return { ok: false, error: "Paper is required." };
  if (!isUuid(studentId)) return { ok: false, error: "Student is required." };
  if (!["present", "absent", "exempt"].includes(attendanceStatus)) {
    return { ok: false, error: "Select present, absent, or exempt." };
  }
  if (remarks.length > 500) {
    return { ok: false, error: "Remarks must be 500 characters or fewer." };
  }

  let marksObtained: number | null = null;
  if (attendanceStatus === "present") {
    if (!marksRaw) {
      return { ok: false, error: "Enter marks for present students." };
    }
    const n = Number(marksRaw);
    if (!Number.isFinite(n) || n < 0 || n > raw.maxMarks) {
      return {
        ok: false,
        error: `Marks must be between 0 and ${raw.maxMarks}.`,
      };
    }
    marksObtained = Math.round(n * 100) / 100;
  }

  return {
    ok: true,
    value: {
      paperId,
      studentId,
      attendanceStatus,
      marksObtained,
      remarks: remarks || null,
    },
  };
}
