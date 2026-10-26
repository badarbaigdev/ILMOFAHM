import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";

export const metadata = {
  title: "Add new student · UI preview",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-ink";

export default function AddStudentUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/students/new"
      title="Add new student"
      breadcrumbs={["Dashboard", "Student", "Add new student"]}
    >
      <form className="space-y-6" aria-label="Add student preview form">
        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Personal info
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Academic year">
              <select className={inputClass} defaultValue="2025-26" disabled>
                <option>Jun 2025/2026</option>
              </select>
            </Field>
            <Field label="Class">
              <select className={inputClass} defaultValue="6" disabled>
                <option>Class 6</option>
              </select>
            </Field>
            <Field label="Section">
              <select className={inputClass} defaultValue="A" disabled>
                <option>A</option>
              </select>
            </Field>
            <Field label="Category">
              <select className={inputClass} defaultValue="General" disabled>
                <option>General</option>
              </select>
            </Field>
            <Field label="Roll number">
              <input className={inputClass} defaultValue="10" readOnly />
            </Field>
            <Field label="Admission no">
              <input className={inputClass} defaultValue="AD1256589" readOnly />
            </Field>
            <Field label="Full name">
              <input className={inputClass} defaultValue="Seth Hallam" readOnly />
            </Field>
            <Field label="Gender">
              <select className={inputClass} defaultValue="Male" disabled>
                <option>Male</option>
              </select>
            </Field>
            <Field label="Date of birth">
              <input className={inputClass} defaultValue="2006-11-10" readOnly />
            </Field>
            <Field label="Phone number">
              <input className={inputClass} defaultValue="789678456" readOnly />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                defaultValue="seth@example.test"
                readOnly
              />
            </Field>
            <Field label="Student photo">
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line text-xs text-muted">
                Drag & drop (preview only)
              </div>
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Parent & guardian info
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Father name">
              <input className={inputClass} defaultValue="Robert Hallam" readOnly />
            </Field>
            <Field label="Father phone">
              <input className={inputClass} defaultValue="2095550100" readOnly />
            </Field>
            <Field label="Mother name">
              <input className={inputClass} defaultValue="Anna Hallam" readOnly />
            </Field>
            <Field label="Mother phone">
              <input className={inputClass} defaultValue="2095550101" readOnly />
            </Field>
            <Field label="Guardian">
              <select className={inputClass} defaultValue="Father" disabled>
                <option>Father</option>
                <option>Mother</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Guardian address">
              <input
                className={inputClass}
                defaultValue="12 Education Avenue, Karachi"
                readOnly
              />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Medical & bank
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Blood group">
              <input className={inputClass} defaultValue="O+" readOnly />
            </Field>
            <Field label="Height">
              <input className={inputClass} defaultValue="5.2 ft" readOnly />
            </Field>
            <Field label="Weight">
              <input className={inputClass} defaultValue="42 kg" readOnly />
            </Field>
            <Field label="Bank account">
              <input className={inputClass} defaultValue="•••• 4521" readOnly />
            </Field>
            <Field label="Bank name">
              <input className={inputClass} defaultValue="HBL" readOnly />
            </Field>
            <Field label="National ID">
              <input className={inputClass} defaultValue="42101-•••••••-1" readOnly />
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Previous school & address
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Previous school">
              <input
                className={inputClass}
                defaultValue="City Primary School"
                readOnly
              />
            </Field>
            <Field label="Previous address">
              <input
                className={inputClass}
                defaultValue="44 Lake Road, Karachi"
                readOnly
              />
            </Field>
            <Field label="Current address">
              <input
                className={inputClass}
                defaultValue="12 Education Avenue, Karachi"
                readOnly
              />
            </Field>
            <Field label="Permanent address">
              <input
                className={inputClass}
                defaultValue="12 Education Avenue, Karachi"
                readOnly
              />
            </Field>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Save (preview only)
          </button>
        </div>
      </form>
    </SchoolAdminPreviewShell>
  );
}
