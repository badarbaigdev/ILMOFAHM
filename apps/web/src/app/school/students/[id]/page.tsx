import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import {
  listSchoolGuardians,
  listSchoolStudentGuardians,
} from "@/features/schools/guardians/queries";
import {
  listSchoolGrades,
  listSchoolSections,
} from "@/features/schools/academic/queries";
import {
  getSchoolStudent,
  listSchoolEnrolments,
} from "@/features/schools/students/queries";
import { SchoolStudentProfilePanel } from "@/features/schools/students/student-profile-panel";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolStudentProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { id: studentId } = await params;
  const query = await searchParams;
  const requestedSchoolId = query.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/students/${studentId}?school=${encodeURIComponent(requestedSchoolId)}`
      : `/school/students/${studentId}`;
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
      <ProfileError title="Student" message="Could not load student." />
    );
  }

  if (!loaded.active) {
    return (
      <ProfileError
        title="Student"
        message="You need an active school membership to view students."
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
          title="Student"
          message="You do not have permission to view students for this school."
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

  let student;
  let enrolments;
  let grades;
  let sections;
  let links;
  let guardians;
  try {
    [student, enrolments, grades, sections, links, guardians] =
      await Promise.all([
        getSchoolStudent(supabase, active.school.id, studentId),
        listSchoolEnrolments(supabase, active.school.id),
        listSchoolGrades(supabase, active.school.id),
        listSchoolSections(supabase, active.school.id),
        listSchoolStudentGuardians(supabase, active.school.id),
        listSchoolGuardians(supabase, active.school.id),
      ]);
  } catch {
    return (
      <ProfileError title="Student" message="Could not load student." />
    );
  }

  if (!student) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <p className="text-sm text-muted">
          <Link
            href={`/school/students?school=${active.school.id}`}
            className="text-ink underline-offset-2 hover:underline"
          >
            Students
          </Link>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Student not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          This student is not in {active.school.name}, or the link is invalid.
        </p>
      </main>
    );
  }

  const enrolment =
    enrolments.find(
      (e) => e.studentId === student.id && e.status === "enrolled",
    ) ?? enrolments.find((e) => e.studentId === student.id);
  const gradeName = enrolment
    ? (grades.find((g) => g.id === enrolment.gradeId)?.name ?? null)
    : null;
  const sectionName = enrolment?.sectionId
    ? (sections.find((s) => s.id === enrolment.sectionId)?.name ?? null)
    : null;
  const classLabel = gradeName
    ? sectionName
      ? `${gradeName} (${sectionName})`
      : gradeName
    : "—";

  const guardianById = new Map(guardians.map((g) => [g.id, g]));
  const linkedGuardians = links
    .filter((l) => l.studentId === student.id && l.status === "active")
    .map((l) => {
      const g = guardianById.get(l.guardianId);
      return {
        guardianId: l.guardianId,
        name: g ? `${g.firstName} ${g.lastName}` : "Guardian",
        relationship: l.relationship,
        isPrimary: l.isPrimary,
        photoUrl: g?.photoUrl ?? null,
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
          href={`/school/students?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Students
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Profile
      </p>
      <div className="mt-4">
        <SchoolStudentProfilePanel
          schoolId={active.school.id}
          student={student}
          classLabel={classLabel}
          enrolmentStatus={enrolment?.status ?? null}
          guardians={linkedGuardians}
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
