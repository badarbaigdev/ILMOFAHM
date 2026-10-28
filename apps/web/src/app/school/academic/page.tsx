import Link from "next/link";
import { redirect } from "next/navigation";

import { SubTabs } from "@/components/ui/sub-tabs";
import {
  SchoolAcademicPanel,
  type AcademicPanelSection,
} from "@/features/schools/academic/academic-panel";
import {
  listSchoolAcademicTerms,
  listSchoolAcademicYears,
  listSchoolGrades,
  listSchoolSections,
  listSchoolSubjects,
} from "@/features/schools/academic/queries";
import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { listSchoolEnrolments } from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ACADEMIC_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "grades", label: "Grades" },
  { id: "years", label: "Years" },
  { id: "subjects", label: "Subjects" },
  { id: "links", label: "Workflows" },
] as const satisfies ReadonlyArray<{ id: AcademicPanelSection; label: string }>;

type PageProps = {
  searchParams: Promise<{ school?: string; section?: string }>;
};

export default async function SchoolAcademicPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const sectionParam = params.section?.trim() ?? "overview";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/academic?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/academic";
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
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Classes
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load academic structure.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Classes
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view academic structure.
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/auth/accept-school-invite"
            className="text-ink underline-offset-2 hover:underline"
          >
            Accept a school invite
          </Link>
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(
      supabase,
      user.id,
      active.school.id,
      "academic.read",
    );
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Classes
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view academic structure for this
            school.
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
    "academic.manage",
  );

  const supportsSchoolStructure =
    active.school.institutionType === "school" ||
    active.school.institutionType === "both";

  let years;
  let terms;
  let grades;
  let sections;
  let subjects;
  let enrolments: Awaited<ReturnType<typeof listSchoolEnrolments>> = [];
  try {
    [years, terms, grades, sections, subjects, enrolments] = await Promise.all([
      listSchoolAcademicYears(supabase, active.school.id),
      listSchoolAcademicTerms(supabase, active.school.id),
      supportsSchoolStructure
        ? listSchoolGrades(supabase, active.school.id)
        : Promise.resolve([]),
      supportsSchoolStructure
        ? listSchoolSections(supabase, active.school.id)
        : Promise.resolve([]),
      supportsSchoolStructure
        ? listSchoolSubjects(supabase, active.school.id)
        : Promise.resolve([]),
      listSchoolEnrolments(supabase, active.school.id).catch(() => []),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Classes
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load academic structure.
        </p>
      </main>
    );
  }

  const sectionLinks = supportsSchoolStructure
    ? ACADEMIC_SECTIONS
    : ACADEMIC_SECTIONS.filter(
        (s) => s.id !== "grades" && s.id !== "subjects",
      );

  const activeSection = sectionLinks.some((s) => s.id === sectionParam)
    ? (sectionParam as AcademicPanelSection)
    : "overview";

  const schoolQuery = `school=${encodeURIComponent(active.school.id)}`;
  const currentYear = years.find((y) => y.isCurrent);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          {active.school.name}
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Classes
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Classes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Years, grades, sections, and subjects for {active.school.name}.
            {currentYear ? (
              <>
                {" "}
                Current year: <span className="text-ink">{currentYear.name}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <SubTabs
        label="Classes sections"
        activeId={activeSection}
        items={sectionLinks.map((section) => ({
          id: section.id,
          label: section.label,
          href: `/school/academic?${schoolQuery}&section=${section.id}`,
          count:
            section.id === "grades"
              ? grades.filter((g) => g.status === "active").length
              : section.id === "years"
                ? years.length
                : section.id === "subjects"
                  ? subjects.filter((s) => s.status === "active").length
                  : undefined,
        }))}
      />

      <div className="mt-8">
        <SchoolAcademicPanel
          schoolId={active.school.id}
          years={years}
          terms={terms}
          grades={grades}
          sections={sections}
          subjects={subjects}
          enrolments={enrolments}
          canManage={canManage}
          supportsSchoolStructure={supportsSchoolStructure}
          activeSection={activeSection}
        />
      </div>
    </main>
  );
}
