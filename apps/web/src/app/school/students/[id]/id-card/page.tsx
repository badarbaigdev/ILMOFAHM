import Link from "next/link";
import { redirect } from "next/navigation";

import {
  listSchoolGrades,
  listSchoolSections,
} from "@/features/schools/academic/queries";
import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  schoolBrandLogoUrl,
  schoolBrandName,
} from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolIdCard } from "@/features/schools/id-cards/id-card";
import {
  getSchoolStudent,
  listSchoolEnrolments,
} from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
};

function schoolContactLine(school: {
  email: string | null;
  phone: string | null;
  city: string | null;
}): string | null {
  const parts = [school.phone, school.email, school.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function SchoolStudentIdCardPage({
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
      ? `/school/students/${studentId}/id-card?school=${encodeURIComponent(requestedSchoolId)}`
      : `/school/students/${studentId}/id-card`;
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
    return <IdCardError message="Could not load student ID card." />;
  }

  if (!loaded.active) {
    return (
      <IdCardError
        message="You need an active school membership to print ID cards."
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
        <IdCardError message="You do not have permission to view this ID card." />
      );
    }
    throw error;
  }

  let student;
  let enrolments;
  let grades;
  let sections;
  try {
    [student, enrolments, grades, sections] = await Promise.all([
      getSchoolStudent(supabase, active.school.id, studentId),
      listSchoolEnrolments(supabase, active.school.id),
      listSchoolGrades(supabase, active.school.id),
      listSchoolSections(supabase, active.school.id),
    ]);
  } catch {
    return <IdCardError message="Could not load student ID card." />;
  }

  if (!student) {
    return <IdCardError message="Student not found." muted />;
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

  const brandName = schoolBrandName(active.school);
  const logoUrl = schoolBrandLogoUrl(active.school);
  const schoolQuery = `school=${encodeURIComponent(active.school.id)}`;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="print:hidden text-sm text-muted">
        <Link
          href={`/school/students/${student.id}?${schoolQuery}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          ← {student.firstName} {student.lastName}
        </Link>
      </p>
      <h1 className="print:hidden mt-3 text-2xl font-semibold tracking-tight text-ink">
        Student ID card
      </h1>
      <div className="mt-6">
        <SchoolIdCard
          schoolName={brandName}
          schoolLogoUrl={logoUrl}
          schoolContact={schoolContactLine(active.school)}
          personName={`${student.firstName} ${student.lastName}`}
          personPhotoUrl={student.photoUrl}
          roleLabel="Student"
          idLabel="Admission no"
          idValue={student.studentNumber}
          detailLabel="Class"
          detailValue={classLabel}
        />
      </div>
    </main>
  );
}

function IdCardError({
  message,
  muted = false,
}: {
  message: string;
  muted?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-ink">ID card</h1>
      <p
        role={muted ? undefined : "alert"}
        className={`mt-4 text-sm ${muted ? "text-muted" : "text-red-700"}`}
      >
        {message}
      </p>
    </main>
  );
}
