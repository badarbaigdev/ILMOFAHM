import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolGuardiansPanel } from "@/features/schools/guardians/guardians-panel";
import {
  listSchoolGuardians,
  listSchoolStudentGuardians,
} from "@/features/schools/guardians/queries";
import { listSchoolStudents } from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolGuardiansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/guardians?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/guardians";
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
          Guardians
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load guardians.
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
          Guardians
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view guardians.
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
          className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-3xl tracking-tight text-ink">
            Guardians
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view guardians for this school.
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

  let guardians;
  let links;
  let students;
  try {
    [guardians, links, students] = await Promise.all([
      listSchoolGuardians(supabase, active.school.id),
      listSchoolStudentGuardians(supabase, active.school.id),
      listSchoolStudents(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Guardians
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load guardians.
        </p>
      </main>
    );
  }

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
        Guardians
      </p>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Guardians
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Contacts and student relationships for {active.school.name}.
        </p>
      </div>

      <div className="mt-8">
        <SchoolGuardiansPanel
          schoolId={active.school.id}
          guardians={guardians}
          links={links}
          students={students}
          canManage={canManage}
        />
      </div>
    </main>
  );
}
