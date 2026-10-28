import { redirect } from "next/navigation";

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
  isSchoolManagerRole,
  requireSchoolMembership,
} from "@/features/schools/authorization";
import { schoolBrandLogoUrl, schoolBrandName } from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolExamsPanel } from "@/features/schools/exams/exams-panel";
import type { AttendanceSummary } from "@/features/schools/exams/report-card";
import {
  listSchoolExamMarks,
  listSchoolExamPapers,
  listSchoolExaminations,
  listSchoolGradingBands,
} from "@/features/schools/exams/queries";
import {
  listSchoolEnrolments,
  listSchoolStudents,
} from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

async function loadAttendanceSummaries(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  schoolId: string,
): Promise<Record<string, AttendanceSummary>> {
  const { data, error } = await supabase
    .from("school_attendance_marks")
    .select("student_id, status")
    .eq("school_id", schoolId);

  if (error || !data) return {};

  const map: Record<string, AttendanceSummary> = {};
  for (const row of data) {
    const id = String(row.student_id);
    const current = map[id] ?? { present: 0, absent: 0, late: 0, total: 0 };
    current.total += 1;
    if (row.status === "present" || row.status === "half_day") {
      current.present += 1;
    } else if (row.status === "absent") {
      current.absent += 1;
    } else if (row.status === "late") {
      current.late += 1;
      current.present += 1;
    }
    map[id] = current;
  }
  return map;
}

export default async function SchoolExamsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/exams?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/exams";
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
        <h1 className="text-2xl font-semibold text-ink">Examinations</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load examinations.
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
        <h1 className="text-2xl font-semibold text-ink">Examinations</h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view examinations.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "exam.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold text-ink">Examinations</h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view examinations for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  let years;
  let terms;
  let grades;
  let sections;
  let subjects;
  let students;
  let enrolments;
  let examinations;
  let papers;
  let marks;
  let gradingBands;
  let attendanceByStudent: Record<string, AttendanceSummary>;

  try {
    [
      years,
      terms,
      grades,
      sections,
      subjects,
      students,
      enrolments,
      examinations,
      papers,
      marks,
      gradingBands,
      attendanceByStudent,
    ] = await Promise.all([
      listSchoolAcademicYears(supabase, active.school.id),
      listSchoolAcademicTerms(supabase, active.school.id),
      listSchoolGrades(supabase, active.school.id),
      listSchoolSections(supabase, active.school.id),
      listSchoolSubjects(supabase, active.school.id),
      listSchoolStudents(supabase, active.school.id),
      listSchoolEnrolments(supabase, active.school.id),
      listSchoolExaminations(supabase, active.school.id),
      listSchoolExamPapers(supabase, active.school.id),
      listSchoolExamMarks(supabase, active.school.id),
      listSchoolGradingBands(supabase, active.school.id),
      loadAttendanceSummaries(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Examinations</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load examination data. Apply the latest database migrations
          and try again.
        </p>
      </main>
    );
  }

  const canManageMarks = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "exam.manage",
  );
  let canAdminister = false;
  try {
    const membership = await requireSchoolMembership(
      supabase,
      user.id,
      active.school.id,
    );
    canAdminister = isSchoolManagerRole(membership.role) && canManageMarks;
  } catch {
    canAdminister = false;
  }

  const address = [
    active.school.addressLine1,
    active.school.city,
    active.school.region,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <SchoolExamsPanel
        schoolId={active.school.id}
        schoolName={schoolBrandName(active.school)}
        schoolLogoUrl={schoolBrandLogoUrl(active.school)}
        schoolEmail={active.school.email}
        schoolPhone={active.school.phone}
        schoolAddress={address || null}
        years={years}
        terms={terms}
        grades={grades}
        sections={sections}
        subjects={subjects}
        students={students}
        enrolments={enrolments}
        examinations={examinations}
        papers={papers}
        marks={marks}
        gradingBands={gradingBands}
        attendanceByStudent={attendanceByStudent}
        canManageMarks={canManageMarks}
        canAdminister={canAdminister}
      />
    </main>
  );
}
