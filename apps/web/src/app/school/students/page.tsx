import Link from "next/link";
import { redirect } from "next/navigation";

import { SubTabs } from "@/components/ui/sub-tabs";
import {
  listSchoolAcademicYears,
  listSchoolGrades,
  listSchoolSections,
} from "@/features/schools/academic/queries";
import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolStudentImportPanel } from "@/features/schools/students/import/import-panel";
import {
  listSchoolStudentImportBatches,
  listSchoolStudentImportRows,
} from "@/features/schools/students/import/queries";
import { SchoolStudentsPanel } from "@/features/schools/students/students-panel";
import {
  listSchoolEnrolments,
  listSchoolStudents,
} from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const STUDENT_SECTIONS = [
  { id: "directory", label: "Directory" },
  { id: "enrolments", label: "Enrolments" },
  { id: "import", label: "Bulk import" },
] as const;

type StudentSectionId = (typeof STUDENT_SECTIONS)[number]["id"];

type PageProps = {
  searchParams: Promise<{ school?: string; import?: string; section?: string }>;
};

export default async function SchoolStudentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const importBatchId = params.import?.trim() ?? "";
  const sectionParam = params.section?.trim() ?? "";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/students?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/students";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  let loaded;
  try {
    loaded = await loadSchoolContext(
      supabase,
      user.id,
      requestedSchoolId,
      hostSchoolSlug ?? undefined,
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Students
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load students.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Students
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view students.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "student.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Students
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view students for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "student.manage",
  );

  let students;
  let enrolments;
  let years;
  let grades;
  let sections;
  let importBatches;
  try {
    [students, enrolments, years, grades, sections, importBatches] =
      await Promise.all([
        listSchoolStudents(supabase, active.school.id),
        listSchoolEnrolments(supabase, active.school.id),
        listSchoolAcademicYears(supabase, active.school.id),
        listSchoolGrades(supabase, active.school.id),
        listSchoolSections(supabase, active.school.id),
        listSchoolStudentImportBatches(supabase, active.school.id),
      ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Students
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load students.
        </p>
      </main>
    );
  }

  const activeBatch = importBatchId
    ? (importBatches.find((batch) => batch.id === importBatchId) ?? null)
    : null;

  let activeRows: Awaited<ReturnType<typeof listSchoolStudentImportRows>> = [];
  if (activeBatch) {
    try {
      activeRows = await listSchoolStudentImportRows(supabase, activeBatch.id);
    } catch {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Students
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            Could not load import details.
          </p>
        </main>
      );
    }
  }

  const resolvedSection: StudentSectionId =
    STUDENT_SECTIONS.some((s) => s.id === sectionParam)
      ? (sectionParam as StudentSectionId)
      : activeBatch
        ? "import"
        : "directory";

  const schoolQuery = `school=${encodeURIComponent(active.school.id)}`;
  const enrolledCount = enrolments.filter((e) => e.status === "enrolled").length;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          {active.school.name}
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Students
      </p>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Students
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Directory, enrolments, and CSV import for {active.school.name}.
        </p>
      </div>

      <SubTabs
        label="Student sections"
        activeId={resolvedSection}
        items={[
          {
            id: "directory",
            label: "Directory",
            href: `/school/students?${schoolQuery}&section=directory`,
            count: students.length,
          },
          {
            id: "enrolments",
            label: "Enrolments",
            href: `/school/students?${schoolQuery}&section=enrolments`,
            count: enrolledCount,
          },
          {
            id: "import",
            label: "Bulk import",
            href: `/school/students?${schoolQuery}&section=import`,
            count: importBatches.length,
          },
        ]}
      />

      <div className="mt-8">
        {resolvedSection === "import" ? (
          <SchoolStudentImportPanel
            schoolId={active.school.id}
            batches={importBatches}
            activeBatch={activeBatch}
            activeRows={activeRows}
            canManage={canManage}
          />
        ) : (
          <SchoolStudentsPanel
            schoolId={active.school.id}
            students={students}
            enrolments={enrolments}
            years={years}
            grades={grades}
            sections={sections}
            canManage={canManage}
            activeSection={resolvedSection}
          />
        )}
      </div>
    </main>
  );
}
