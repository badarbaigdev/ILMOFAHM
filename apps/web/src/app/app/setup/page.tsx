import { redirect } from "next/navigation";

import { PageSectionNav } from "@/components/shell/PageSectionNav";
import { AcademyPanel } from "@/features/academic/academy/academy-panel";
import { listCohorts, listCourses } from "@/features/academic/academy/queries";
import { SchoolPanel } from "@/features/academic/school/school-panel";
import {
  listGrades,
  listSections,
  listSubjects,
} from "@/features/academic/school/queries";
import { YearsPanel } from "@/features/academic/years/years-panel";
import {
  listAcademicTermsForOrganization,
  listAcademicYears,
} from "@/features/academic/years/queries";
import {
  institutionTypeLabel,
  isInstitutionType,
  supportsAcademy,
  supportsSchool,
  type InstitutionType,
} from "@/features/institution/mode";
import {
  authorize,
  can,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SetupPageProps = {
  searchParams: Promise<{ organization?: string; campus?: string }>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app/setup");
  }

  let context;
  try {
    context = await loadWorkspaceContext(supabase, user.id, {
      organizationId: params.organization,
      campusId: params.campus,
    });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Academic setup
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load academic setup.
        </p>
      </main>
    );
  }

  if (!context) {
    redirect("/app/onboarding");
  }

  const deps = createSupabaseAuthorizationDeps(supabase, { user });

  try {
    await authorize(
      {
        organizationId: context.organization.id,
        permission: "academic.read",
      },
      deps,
    );
  } catch (authError) {
    if (isAuthorizationError(authError)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-4xl tracking-tight text-ink">
            Academic setup
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            {authError.message}
          </p>
        </main>
      );
    }
    throw authError;
  }

  const canManage = await can(
    {
      organizationId: context.organization.id,
      permission: "academic.manage",
    },
    deps,
  );

  const rawType = context.organization.institutionType;
  const institutionType: InstitutionType = isInstitutionType(rawType)
    ? rawType
    : "school";
  const showSchool = supportsSchool(institutionType);
  const showAcademy = supportsAcademy(institutionType);

  const [years, terms, grades, sectionRows, subjects, courses, cohorts] =
    await Promise.all([
      listAcademicYears(supabase, context.organization.id),
      listAcademicTermsForOrganization(supabase, context.organization.id),
      showSchool
        ? listGrades(supabase, context.organization.id)
        : Promise.resolve([]),
      showSchool
        ? listSections(supabase, context.organization.id)
        : Promise.resolve([]),
      showSchool
        ? listSubjects(supabase, context.organization.id)
        : Promise.resolve([]),
      showAcademy
        ? listCourses(supabase, context.organization.id)
        : Promise.resolve([]),
      showAcademy
        ? listCohorts(supabase, context.organization.id)
        : Promise.resolve([]),
    ]);

  const pageSections = [
    { id: "academic-years-heading", label: "Academic years" },
    ...(showSchool
      ? [{ id: "school-structure-heading", label: "School structure" }]
      : []),
    ...(showAcademy
      ? [{ id: "academy-structure-heading", label: "Academy structure" }]
      : []),
  ];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Academic
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Academic setup
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Configure years, terms, and structure for{" "}
        <span className="font-medium text-ink">
          {context.organization.name}
        </span>{" "}
        ({institutionTypeLabel(institutionType)}).
      </p>

      <div className="mt-8">
        <ContextSelector
          organizations={context.organizations}
          campuses={context.allCampuses}
          organizationId={context.organization.id}
          campusId={context.campus?.id ?? null}
          returnTo="/app/setup"
        />
      </div>

      <PageSectionNav sections={pageSections} />

      <YearsPanel
        organizationId={context.organization.id}
        years={years}
        terms={terms}
        canManage={canManage}
      />

      {showSchool ? (
        <SchoolPanel
          organizationId={context.organization.id}
          grades={grades}
          sections={sectionRows}
          subjects={subjects}
          canManage={canManage}
        />
      ) : (
        <p className="mt-12 text-sm text-muted" role="status">
          School grades and sections are hidden for academy-only institutions.
        </p>
      )}

      {showAcademy ? (
        <AcademyPanel
          organizationId={context.organization.id}
          courses={courses}
          cohorts={cohorts}
          years={years}
          canManage={canManage}
        />
      ) : (
        <p className="mt-12 text-sm text-muted" role="status">
          Academy courses and cohorts are hidden for school-only institutions.
        </p>
      )}
    </main>
  );
}
