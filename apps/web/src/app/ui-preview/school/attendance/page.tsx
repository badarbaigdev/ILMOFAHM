import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import { previewStudents } from "@/features/schools/ui-preview/sms-fixtures";

export const metadata = {
  title: "Attendance · UI preview",
};

const STATUSES = ["present", "absent", "late", "excused", "leave"] as const;

export default function AttendanceUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/attendance"
      title="Daily attendance"
      breadcrumbs={["Dashboard", "Attendance"]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          disabled
          className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm"
          defaultValue="6A"
        >
          <option>Class 6 · Section A</option>
        </select>
        <input
          type="date"
          readOnly
          defaultValue="2026-10-22"
          className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          Submit (preview)
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-paper-elevated">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Roll</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {previewStudents.map((student, index) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-medium text-ink">
                  {student.firstName} {student.lastName}
                </td>
                <td className="px-4 py-3">{student.rollNo}</td>
                <td className="px-4 py-3">
                  <select
                    disabled
                    className="rounded-md border border-line bg-paper px-2 py-1 text-sm"
                    defaultValue={STATUSES[index % STATUSES.length]}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted">
                  {index === 1 ? "Bus delay" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SchoolAdminPreviewShell>
  );
}
