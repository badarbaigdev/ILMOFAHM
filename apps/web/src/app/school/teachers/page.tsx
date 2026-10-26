import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolTeachersPanel } from "@/features/schools/teachers/teachers-panel";
import { listSchoolTeachers } from "@/features/schools/teachers/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolTeachersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/teachers?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/teachers";
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
        className="mx-auto w-full max-w-5xl px-6 py-10 outline-none sm:px-8"
      >
        <h1 className="text-2xl font-semibold text-ink">Teachers</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load teachers.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-10 outline-none sm:px-8"
      >
        <h1 className="text-2xl font-semibold text-ink">Teachers</h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view teachers.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "teacher.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-6 py-10 outline-none sm:px-8"
        >
          <h1 className="text-2xl font-semibold text-ink">Teachers</h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view teachers for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  let teachers;
  try {
    teachers = await listSchoolTeachers(supabase, active.school.id);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-10 outline-none sm:px-8"
      >
        <h1 className="text-2xl font-semibold text-ink">Teachers</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load the teacher directory.
        </p>
      </main>
    );
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "teacher.manage",
  );

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
        Teacher list
      </p>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Teacher list
        </h1>
        <p className="mt-1 text-sm text-muted">
          Teaching staff directory for {active.school.name}. Login access is
          still managed under Staff &amp; roles.
        </p>
      </div>

      <div className="mt-8">
        <SchoolTeachersPanel
          schoolId={active.school.id}
          teachers={teachers}
          canManage={canManage}
        />
      </div>

      <p className="mt-6 text-sm text-muted">
        Need login access for a teacher?{" "}
        <Link
          href={`/school/members?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Invite them as staff
        </Link>
        .
      </p>
    </main>
  );
}
