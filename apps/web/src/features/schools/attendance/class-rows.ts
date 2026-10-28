import type {
  SchoolGradeRow,
  SchoolSectionRow,
} from "@/features/schools/academic/queries";
import type { SchoolEnrolmentRow } from "@/features/schools/students/queries";
import type { SchoolAttendanceSessionRow } from "@/features/schools/attendance/queries";

export type AttendanceClassRow = {
  sectionId: string;
  gradeId: string;
  gradeName: string;
  sectionName: string;
  studentCount: number;
  /** Today's session status, or `not_started` when none exists. */
  sessionStatus: "not_started" | "draft" | "submitted" | string;
};

/**
 * Active sections for the attendance class picker.
 * Includes sections with zero enrolled students so staff can still open a
 * register (empty roster) without filtering them away.
 */
export function buildAttendanceClassRows(input: {
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  enrolments: SchoolEnrolmentRow[];
  daySessions: SchoolAttendanceSessionRow[];
}): AttendanceClassRow[] {
  const gradeById = new Map(input.grades.map((g) => [g.id, g]));
  const sessionBySection = new Map(
    input.daySessions.map((s) => [s.sectionId, s]),
  );

  const counts = new Map<string, number>();
  for (const enrolment of input.enrolments) {
    if (enrolment.status !== "enrolled" || !enrolment.sectionId) continue;
    counts.set(
      enrolment.sectionId,
      (counts.get(enrolment.sectionId) ?? 0) + 1,
    );
  }

  const rows: AttendanceClassRow[] = [];
  for (const section of input.sections) {
    if (section.status !== "active") continue;
    const grade = gradeById.get(section.gradeId);
    if (!grade || grade.status !== "active") continue;
    const session = sessionBySection.get(section.id);
    rows.push({
      sectionId: section.id,
      gradeId: section.gradeId,
      gradeName: grade.name,
      sectionName: section.name,
      studentCount: counts.get(section.id) ?? 0,
      sessionStatus: session?.status ?? "not_started",
    });
  }

  rows.sort((a, b) => {
    const gradeA = gradeById.get(a.gradeId);
    const gradeB = gradeById.get(b.gradeId);
    return (
      (gradeA?.sortOrder ?? 0) - (gradeB?.sortOrder ?? 0) ||
      a.gradeName.localeCompare(b.gradeName) ||
      a.sectionName.localeCompare(b.sectionName)
    );
  });

  return rows;
}
