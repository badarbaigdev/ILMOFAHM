export type GradingBand = {
  minPercent: number;
  maxPercent: number;
  gradeLabel: string;
  isPass: boolean;
  sortOrder: number;
};

export type SubjectMarkInput = {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  passMarks: number;
  marksObtained: number | null;
  attendanceStatus: "present" | "absent" | "exempt" | "missing";
  remarks?: string | null;
};

export type SubjectResult = SubjectMarkInput & {
  percent: number | null;
  gradeLabel: string | null;
  passed: boolean | null;
};

export type StudentExamResult = {
  studentId: string;
  subjects: SubjectResult[];
  totalObtained: number;
  totalMax: number;
  percent: number | null;
  gradeLabel: string | null;
  overallStatus: "pass" | "fail" | "incomplete" | "absent" | "unpublished";
  rank: number | null;
};

export function roundPercent(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function gradeForPercent(
  percent: number | null,
  bands: GradingBand[],
): { gradeLabel: string; isPass: boolean } | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  const ordered = [...bands].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const band of ordered) {
    if (percent >= band.minPercent && percent <= band.maxPercent + 1e-9) {
      return { gradeLabel: band.gradeLabel, isPass: band.isPass };
    }
  }
  // Fallback: below all bands → last (usually F)
  const last = ordered[ordered.length - 1];
  if (!last) return null;
  return { gradeLabel: last.gradeLabel, isPass: last.isPass };
}

export function evaluateSubject(
  input: SubjectMarkInput,
  bands: GradingBand[],
): SubjectResult {
  if (input.attendanceStatus === "absent") {
    return {
      ...input,
      percent: null,
      gradeLabel: "Abs",
      passed: false,
    };
  }
  if (input.attendanceStatus === "exempt") {
    return {
      ...input,
      percent: null,
      gradeLabel: "Ex",
      passed: null,
    };
  }
  if (
    input.attendanceStatus === "missing" ||
    input.marksObtained == null
  ) {
    return {
      ...input,
      percent: null,
      gradeLabel: null,
      passed: null,
    };
  }

  const percent =
    input.maxMarks > 0
      ? roundPercent((input.marksObtained / input.maxMarks) * 100)
      : null;
  const graded = gradeForPercent(percent, bands);
  const passed =
    input.marksObtained >= input.passMarks && (graded?.isPass ?? true);

  return {
    ...input,
    percent,
    gradeLabel: graded?.gradeLabel ?? null,
    passed,
  };
}

export function buildStudentExamResult(input: {
  studentId: string;
  subjects: SubjectMarkInput[];
  bands: GradingBand[];
  examPublished: boolean;
}): Omit<StudentExamResult, "rank"> {
  const subjects = input.subjects.map((s) => evaluateSubject(s, input.bands));

  if (!input.examPublished) {
    return {
      studentId: input.studentId,
      subjects,
      totalObtained: 0,
      totalMax: 0,
      percent: null,
      gradeLabel: null,
      overallStatus: "unpublished",
    };
  }

  const counted = subjects.filter((s) => s.attendanceStatus !== "exempt");
  const allAbsent =
    counted.length > 0 &&
    counted.every((s) => s.attendanceStatus === "absent");
  const incomplete = subjects.some(
    (s) =>
      s.attendanceStatus === "missing" ||
      (s.attendanceStatus === "present" && s.marksObtained == null),
  );

  let totalObtained = 0;
  let totalMax = 0;
  for (const s of counted) {
    totalMax += s.maxMarks;
    if (s.attendanceStatus === "present" && s.marksObtained != null) {
      totalObtained += s.marksObtained;
    }
  }

  const percent =
    totalMax > 0 ? roundPercent((totalObtained / totalMax) * 100) : null;
  const graded = gradeForPercent(percent, input.bands);

  let overallStatus: StudentExamResult["overallStatus"] = "pass";
  if (allAbsent) {
    overallStatus = "absent";
  } else if (incomplete) {
    overallStatus = "incomplete";
  } else if (
    subjects.some((s) => s.passed === false) ||
    graded?.isPass === false
  ) {
    overallStatus = "fail";
  } else {
    overallStatus = "pass";
  }

  return {
    studentId: input.studentId,
    subjects,
    totalObtained: roundPercent(totalObtained),
    totalMax: roundPercent(totalMax),
    percent,
    gradeLabel: graded?.gradeLabel ?? null,
    overallStatus,
  };
}

/** Assign dense ranks by percent (desc). Ties share rank; next skips. */
export function assignRanks(
  results: Array<Omit<StudentExamResult, "rank">>,
  enabled: boolean,
): StudentExamResult[] {
  if (!enabled) {
    return results.map((r) => ({ ...r, rank: null }));
  }

  const eligible = results
    .filter(
      (r) =>
        r.overallStatus === "pass" ||
        r.overallStatus === "fail" ||
        r.overallStatus === "incomplete",
    )
    .filter((r) => r.percent != null)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));

  const rankByStudent = new Map<string, number>();
  let i = 0;
  while (i < eligible.length) {
    const pct = eligible[i]!.percent!;
    let j = i;
    while (j < eligible.length && eligible[j]!.percent === pct) j += 1;
    const rank = i + 1;
    for (let k = i; k < j; k += 1) {
      rankByStudent.set(eligible[k]!.studentId, rank);
    }
    i = j;
  }

  return results.map((r) => ({
    ...r,
    rank: rankByStudent.get(r.studentId) ?? null,
  }));
}
