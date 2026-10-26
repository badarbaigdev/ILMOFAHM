import Link from "next/link";
import { redirect } from "next/navigation";

import { PageSectionNav } from "@/components/shell/PageSectionNav";
import { SchoolAcademicPanel } from "@/features/schools/academic/academic-panel";
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
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ACADEMIC_SECTIONS = [
  { id: "school-academic-years-heading", label: "Years" },
  { id: "school-structure-heading", label: "Structure" },
] as const;

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolAcademicPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
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
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Academic
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
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Academic
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
          className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-3xl tracking-tight text-ink">
            Academic
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
  try {
    [years, terms, grades, sections, subjects] = await Promise.all([
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
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Academic
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load academic structure.
        </p>
      </main>
    );
  }

  const sectionLinks = supportsSchoolStructure
    ? ACADEMIC_SECTIONS
    : ACADEMIC_SECTIONS.filter((s) => s.id !== "school-structure-heading");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          ← {active.school.name}
        </Link>
      </p>
      <h1 className="mt-4 font-display text-3xl tracking-tight text-ink">
        Academic
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Years, terms, grades, sections, and subjects for{" "}
        {active.school.name}.
      </p>

      <PageSectionNav sections={sectionLinks} />

      <div className="mt-10">
        <SchoolAcademicPanel
          schoolId={active.school.id}
          years={years}
          terms={terms}
          grades={grades}
          sections={sections}
          subjects={subjects}
          canManage={canManage}
          supportsSchoolStructure={supportsSchoolStructure}
        />
      </div>
    </main>
  );
}
