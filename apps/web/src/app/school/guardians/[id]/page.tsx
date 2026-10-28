import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import {
  getSchoolGuardian,
  listSchoolStudentGuardians,
} from "@/features/schools/guardians/queries";
import { SchoolGuardianProfilePanel } from "@/features/schools/guardians/guardian-profile-panel";
import { listSchoolStudents } from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolGuardianProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id: guardianId } = await params;
  const query = await searchParams;
  const requestedSchoolId = query.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/guardians/${guardianId}?school=${encodeURIComponent(requestedSchoolId)}`
      : `/school/guardians/${guardianId}`;
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
      <ProfileError title="Guardian" message="Could not load guardian." />
    );
  }

  if (!loaded.active) {
    return (
      <ProfileError
        title="Guardian"
        message="You need an active school membership to view guardians."
        muted
      />
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "student.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <ProfileError
          title="Guardian"
          message="You do not have permission to view guardians for this school."
        />
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

  let guardian;
  let links;
  let students;
  try {
    [guardian, links, students] = await Promise.all([
      getSchoolGuardian(supabase, active.school.id, guardianId),
      listSchoolStudentGuardians(supabase, active.school.id),
      listSchoolStudents(supabase, active.school.id),
    ]);
  } catch {
    return (
      <ProfileError title="Guardian" message="Could not load guardian." />
    );
  }

  if (!guardian) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <p className="text-sm text-muted">
          <Link
            href={`/school/guardians?school=${active.school.id}`}
            className="text-ink underline-offset-2 hover:underline"
          >
            Guardians
          </Link>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Guardian not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          This guardian is not in {active.school.name}, or the link is invalid.
        </p>
      </main>
    );
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const linkedStudents = links
    .filter((l) => l.guardianId === guardian.id && l.status === "active")
    .map((l) => {
      const s = studentById.get(l.studentId);
      return {
        studentId: l.studentId,
        name: s ? `${s.firstName} ${s.lastName}` : "Student",
        studentNumber: s?.studentNumber ?? "—",
        relationship: l.relationship,
        isPrimary: l.isPrimary,
        photoUrl: s?.photoUrl ?? null,
      };
    });

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
          href={`/school/guardians?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Guardians
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Profile
      </p>
      <div className="mt-4">
        <SchoolGuardianProfilePanel
          schoolId={active.school.id}
          guardian={guardian}
          students={linkedStudents}
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
