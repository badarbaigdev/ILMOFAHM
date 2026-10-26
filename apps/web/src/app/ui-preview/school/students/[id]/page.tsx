import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import {
  getPreviewStudent,
  previewAttendanceGrid,
  previewAttendanceMonths,
  previewStudentAttendanceSummary,
} from "@/features/schools/ui-preview/sms-fixtures";

export const metadata = {
  title: "Student details · UI preview",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const CODE_CLASS: Record<string, string> = {
  P: "text-emerald-700",
  A: "text-red-600",
  L: "text-sky-700",
  H: "text-orange-600",
  F: "text-violet-700",
};

export default async function StudentDetailsUiPreviewPage({
  params,
}: PageProps) {
  assertUiPreviewAllowed();
  const { id } = await params;
  const student = getPreviewStudent(id);
  if (!student) notFound();

  const summary = [
    {
      label: "Total present",
      value: previewStudentAttendanceSummary.present,
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      label: "Total absent",
      value: previewStudentAttendanceSummary.absent,
      tone: "bg-red-100 text-red-800",
    },
    {
      label: "Half day",
      value: previewStudentAttendanceSummary.halfDay,
      tone: "bg-violet-100 text-violet-800",
    },
    {
      label: "Total late",
      value: previewStudentAttendanceSummary.late,
      tone: "bg-sky-100 text-sky-800",
    },
    {
      label: "Total holiday",
      value: previewStudentAttendanceSummary.holiday,
      tone: "bg-orange-100 text-orange-800",
    },
  ];

  return (
    <SchoolAdminPreviewShell
      pathname={`/ui-preview/school/students/${student.id}`}
      title="Student details"
      breadcrumbs={["Dashboard", "Student", "Student details"]}
      actions={
        <button
          type="button"
          className="rounded-md border border-line px-3 py-2 text-sm text-ink"
        >
          Login details
        </button>
      }
    >
      <section className="rounded-xl border border-line bg-paper-elevated p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-full bg-teal/15 text-xl font-semibold text-teal"
            >
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {student.firstName} {student.lastName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Admission no{" "}
                <span className="text-teal">{student.admissionNo}</span>
              </p>
              <p className="text-sm text-muted">Roll number {student.rollNo}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
                >
                  Suspend
                </button>
                <button
                  type="button"
                  className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-white"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Active
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Class", `${student.classLabel} (${student.academicYear})`],
            ["Section", student.section],
            ["Roll no", student.rollNo],
            ["Gender", student.gender],
            ["Date of birth", student.dateOfBirth],
            ["Category", student.category],
            ["Academic year", student.academicYear],
            ["Phone", student.phone],
            ["Email", student.email],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted uppercase">{label}</dt>
              <dd className="mt-1 text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav
        aria-label="Student sections"
        className="mt-4 flex flex-wrap gap-1 border-b border-line"
      >
        {[
          "Student details",
          "Attendance",
          "Leave",
          "Fees",
          "Exam",
          "Library",
        ].map((tab) => (
          <span
            key={tab}
            className={
              tab === "Attendance"
                ? "border-b-2 border-teal px-3 py-2 text-sm font-medium text-teal"
                : "px-3 py-2 text-sm text-muted"
            }
          >
            {tab}
          </span>
        ))}
      </nav>

      <section className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summary.map((card) => (
            <article
              key={card.label}
              className={`rounded-xl px-4 py-3 ${card.tone}`}
            >
              <p className="text-xs font-medium">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <select
            disabled
            className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm"
            defaultValue="2024/2025"
          >
            <option>Year 2024/2025</option>
          </select>
          <p className="text-xs text-muted">
            P: Present · A: Absent · H: Holiday · L: Late · F: Half day
          </p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper-elevated">
          <table className="min-w-full text-center text-[0.65rem]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="sticky left-0 bg-paper-elevated px-2 py-2 text-left">
                  Month
                </th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="px-1 py-2 font-medium">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewAttendanceMonths.map((month, mi) => (
                <tr key={month} className="border-b border-line/60">
                  <td className="sticky left-0 bg-paper-elevated px-2 py-1.5 text-left font-medium text-ink">
                    {month}
                  </td>
                  {(previewAttendanceGrid[mi] ?? []).map((code, di) => (
                    <td
                      key={`${month}-${di}`}
                      className={`px-1 py-1.5 font-semibold ${CODE_CLASS[code] ?? "text-muted"}`}
                    >
                      {code || "·"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm">
          <Link
            href="/ui-preview/school/students"
            className="text-ink underline-offset-2 hover:underline"
          >
            ← Back to student list
          </Link>
        </p>
      </section>
    </SchoolAdminPreviewShell>
  );
}
