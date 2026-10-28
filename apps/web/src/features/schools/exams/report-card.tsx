"use client";

import type { StudentExamResult } from "@/features/schools/exams/calculate";
import { SchoolLogo } from "@/features/schools/ui/school-logo";
import { PersonAvatar } from "@/features/schools/ui/data-table";

export type ReportCardStudent = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
};

export type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  total: number;
};

type Props = {
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  examName: string;
  examTypeLabel: string;
  yearName: string;
  classLabel: string;
  sectionLabel: string;
  student: ReportCardStudent;
  result: StudentExamResult;
  attendance?: AttendanceSummary | null;
  teacherRemarks?: string;
};

export function ExamReportCard({
  schoolName,
  schoolLogoUrl = null,
  schoolEmail = null,
  schoolPhone = null,
  schoolAddress = null,
  examName,
  examTypeLabel,
  yearName,
  classLabel,
  sectionLabel,
  student,
  result,
  attendance = null,
  teacherRemarks = "",
}: Props) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const statusLabel =
    result.overallStatus === "pass"
      ? "Pass"
      : result.overallStatus === "fail"
        ? "Fail"
        : result.overallStatus === "absent"
          ? "Absent"
          : result.overallStatus === "incomplete"
            ? "Incomplete"
            : "Unpublished";

  return (
    <article className="school-print-face mx-auto max-w-[210mm] bg-white p-6 text-ink">
      <header className="flex items-start gap-4 border-b border-line pb-4">
        <SchoolLogo schoolName={schoolName} logoUrl={schoolLogoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-ink">
            {schoolName}
          </p>
          <p className="mt-0.5 text-sm text-muted">Student report card</p>
          <p className="mt-2 text-xs text-muted">
            {[schoolAddress, schoolPhone, schoolEmail]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <PersonAvatar
          name={fullName}
          photoUrl={student.photoUrl}
          size="lg"
        />
      </header>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted">Student: </span>
          <span className="font-medium">{fullName}</span>
        </p>
        <p>
          <span className="text-muted">Admission no.: </span>
          <span className="font-medium">{student.studentNumber}</span>
        </p>
        <p>
          <span className="text-muted">Class / section: </span>
          <span className="font-medium">
            {classLabel} · {sectionLabel}
          </span>
        </p>
        <p>
          <span className="text-muted">Session: </span>
          <span className="font-medium">{yearName}</span>
        </p>
        <p>
          <span className="text-muted">Examination: </span>
          <span className="font-medium">
            {examName} ({examTypeLabel})
          </span>
        </p>
        {result.rank != null ? (
          <p>
            <span className="text-muted">Position: </span>
            <span className="font-medium">{result.rank}</span>
          </p>
        ) : null}
      </div>

      <table className="mt-5 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
            <th className="py-2 pr-2 font-medium">Subject</th>
            <th className="py-2 pr-2 font-medium">Max</th>
            <th className="py-2 pr-2 font-medium">Obtained</th>
            <th className="py-2 pr-2 font-medium">Grade</th>
            <th className="py-2 font-medium">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((subject) => (
            <tr key={subject.subjectId} className="border-b border-line/70">
              <td className="py-2 pr-2 font-medium">{subject.subjectName}</td>
              <td className="py-2 pr-2">{subject.maxMarks}</td>
              <td className="py-2 pr-2">
                {subject.attendanceStatus === "absent"
                  ? "Abs"
                  : subject.attendanceStatus === "exempt"
                    ? "Ex"
                    : subject.marksObtained == null
                      ? "—"
                      : subject.marksObtained}
              </td>
              <td className="py-2 pr-2">{subject.gradeLabel ?? "—"}</td>
              <td className="py-2 text-muted">{subject.remarks ?? ""}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-semibold">
            <td className="py-2 pr-2">Total</td>
            <td className="py-2 pr-2">{result.totalMax}</td>
            <td className="py-2 pr-2">{result.totalObtained}</td>
            <td className="py-2 pr-2" colSpan={2}>
              {result.percent != null ? `${result.percent}%` : "—"} ·{" "}
              {result.gradeLabel ?? "—"} · {statusLabel}
            </td>
          </tr>
        </tfoot>
      </table>

      {attendance && attendance.total > 0 ? (
        <p className="mt-4 text-sm text-muted">
          Attendance (period registers): present {attendance.present}, absent{" "}
          {attendance.absent}, late {attendance.late} of {attendance.total}{" "}
          marked days.
        </p>
      ) : null}

      <div className="mt-4 text-sm">
        <p className="text-muted">Teacher remarks</p>
        <p className="mt-1 min-h-[3rem] border-b border-dashed border-line pb-2">
          {teacherRemarks || "\u00a0"}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6 text-center text-xs text-muted">
        <div>
          <div className="mb-10 border-b border-line" />
          Class teacher
        </div>
        <div>
          <div className="mb-10 border-b border-line" />
          Principal
        </div>
        <div>
          <div className="mb-10 border-b border-line" />
          School stamp
        </div>
      </div>
    </article>
  );
}
