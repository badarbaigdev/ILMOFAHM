import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { getSchoolTeacher } from "@/features/schools/teachers/queries";
import { SchoolTeacherProfilePanel } from "@/features/schools/teachers/teacher-profile-panel";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolTeacherProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id: teacherId } = await params;
  const query = await searchParams;
  const requestedSchoolId = query.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/teachers/${teacherId}?school=${encodeURIComponent(requestedSchoolId)}`
      : `/school/teachers/${teacherId}`;
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
      <ProfileError title="Teacher" message="Could not load teacher." />
    );
  }

  if (!loaded.active) {
    return (
      <ProfileError
        title="Teacher"
        message="You need an active school membership to view teachers."
        muted
      />
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "teacher.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <ProfileError
          title="Teacher"
          message="You do not have permission to view teachers for this school."
        />
      );
    }
    throw error;
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "teacher.manage",
  );

  let teacher;
  try {
    teacher = await getSchoolTeacher(supabase, active.school.id, teacherId);
  } catch {
    return (
      <ProfileError title="Teacher" message="Could not load teacher." />
    );
  }

  if (!teacher) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <p className="text-sm text-muted">
          <Link
            href={`/school/teachers?school=${active.school.id}`}
            className="text-ink underline-offset-2 hover:underline"
          >
            Teachers
          </Link>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Teacher not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          This teacher is not in {active.school.name}, or the link is invalid.
        </p>
      </main>
    );
  }

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
        <Link
          href={`/school/teachers?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Teachers
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Profile
      </p>
      <div className="mt-4">
        <SchoolTeacherProfilePanel
          schoolId={active.school.id}
          teacher={teacher}
          canManage={canManage}
        />
      </div>
    </main>
  );
}

function ProfileError({
  title,
  message,
  muted = false,
}: {
  title: string;
  message: string;
  muted?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p
        role={muted ? undefined : "alert"}
        className={`mt-4 text-sm ${muted ? "text-muted" : "text-red-700"}`}
      >
        {message}
      </p>
    </main>
  );
}
