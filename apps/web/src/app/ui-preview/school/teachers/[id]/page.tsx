import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import { getPreviewTeacher } from "@/features/schools/ui-preview/sms-fixtures";

export const metadata = {
  title: "Teacher details · UI preview",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherDetailsUiPreviewPage({
  params,
}: PageProps) {
  assertUiPreviewAllowed();
  const { id } = await params;
  const teacher = getPreviewTeacher(id);
  if (!teacher) notFound();

  return (
    <SchoolAdminPreviewShell
      pathname={`/ui-preview/school/teachers/${teacher.id}`}
      title="Teacher details"
      breadcrumbs={["Dashboard", "Teacher", "Teacher details"]}
      actions={
        <button
          type="button"
          className="rounded-md border border-line px-3 py-2 text-sm text-ink"
        >
          Login details
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-paper-elevated p-5 lg:col-span-1">
          <div className="flex flex-col items-start gap-3">
            <div
              aria-hidden
              className="flex h-24 w-24 items-center justify-center rounded-full bg-teal/15 text-2xl font-semibold text-teal"
            >
              {teacher.firstName[0]}
              {teacher.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {teacher.firstName} {teacher.lastName}
              </h2>
              <p className="mt-1 text-sm text-teal">{teacher.staffId}</p>
              <p className="text-sm text-muted">{teacher.subject}</p>
            </div>
            <div className="flex gap-2">
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
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Personal info</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              Active
            </span>
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Class", teacher.classes],
              ["Contract type", teacher.contract],
              ["Shift", teacher.shift],
              ["Work location", teacher.location],
              ["Date of birth", teacher.dateOfBirth],
              ["Gender", teacher.gender],
              ["Join date", teacher.joinDate],
              ["Phone", teacher.phone],
              ["Email", teacher.email],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted uppercase">{label}</dt>
                <dd className="mt-1 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <nav
        aria-label="Teacher sections"
        className="mt-4 flex flex-wrap gap-1 border-b border-line"
      >
        {[
          "Teacher details",
          "Class timetable",
          "Attendance",
          "Leave",
          "Payroll",
          "Library",
        ].map((tab) => (
          <span
            key={tab}
            className={
              tab === "Teacher details"
                ? "border-b-2 border-teal px-3 py-2 text-sm font-medium text-teal"
                : "px-3 py-2 text-sm text-muted"
            }
          >
            {tab}
          </span>
        ))}
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h3 className="text-sm font-semibold text-ink">Profile detail</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Date of birth", teacher.dateOfBirth],
              ["Marital status", teacher.maritalStatus],
              ["Qualification", teacher.qualification],
              ["Experience", teacher.experience],
              ["Father name", teacher.fatherName],
              ["Mother name", teacher.motherName],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted uppercase">{label}</dt>
                <dd className="mt-1 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h3 className="text-sm font-semibold text-ink">
            Previous school & address
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted uppercase">Current address</dt>
              <dd className="mt-1 text-ink">{teacher.address}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted uppercase">Permanent address</dt>
              <dd className="mt-1 text-ink">{teacher.permanentAddress}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h3 className="text-sm font-semibold text-ink">Bank & medical</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Bank", teacher.bankName],
              ["Branch", teacher.bankBranch],
              ["IFSC", teacher.ifsc],
              ["Blood group", teacher.bloodGroup],
              ["Height", teacher.height],
              ["Weight", teacher.weight],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted uppercase">{label}</dt>
                <dd className="mt-1 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h3 className="text-sm font-semibold text-ink">Description</h3>
          <p className="mt-3 text-sm text-muted">{teacher.bio}</p>
          <p className="mt-4 text-sm">
            <Link
              href="/ui-preview/school/teachers"
              className="text-ink underline-offset-2 hover:underline"
            >
              ← Back to teacher list
            </Link>
          </p>
        </section>
      </div>
    </SchoolAdminPreviewShell>
  );
}
