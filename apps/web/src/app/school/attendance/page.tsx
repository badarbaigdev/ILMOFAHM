import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { schoolBrandLogoUrl, schoolBrandName } from "@/features/schools/branding";
import { SchoolAttendancePanel } from "@/features/schools/attendance/attendance-panel";
import { buildAttendanceClassRows } from "@/features/schools/attendance/class-rows";
import {
  getSchoolAttendanceSession,
  listSchoolAttendanceMarks,
  listSchoolAttendanceMarksForDate,
  listSchoolAttendanceSessions,
  listSchoolAttendanceSessionsForDate,
} from "@/features/schools/attendance/queries";
import { summarizeSchoolAttendanceDay } from "@/features/schools/attendance/summary";
import {
  listSchoolGrades,
  listSchoolSections,
} from "@/features/schools/academic/queries";
import { loadSchoolContext } from "@/features/schools/context";
import {
  listSchoolEnrolments,
  listSchoolStudents,
} from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    school?: string;
    section?: string;
    date?: string;
  }>;
};

export default async function SchoolAttendancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const selectedSectionId = params.section?.trim() ?? "";
  const selectedDate =
    params.date?.trim() || new Date().toISOString().slice(0, 10);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/attendance?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/attendance";
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
          Attendance
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load attendance.
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
          Attendance
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view attendance.
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
      "attendance.read",
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
            Attendance
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view attendance for this school.
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
    "attendance.manage",
  );
  const canCorrect =
    active.membership.role === "owner" || active.membership.role === "admin";

  let sections;
  let grades;
  let students;
  let enrolments;
  let sessions;
  let daySessions;
  let dayMarks;
  try {
    [
      sections,
      grades,
      students,
      enrolments,
      sessions,
      daySessions,
      dayMarks,
    ] = await Promise.all([
      listSchoolSections(supabase, active.school.id),
      listSchoolGrades(supabase, active.school.id),
      listSchoolStudents(supabase, active.school.id),
      listSchoolEnrolments(supabase, active.school.id),
      listSchoolAttendanceSessions(supabase, active.school.id),
      listSchoolAttendanceSessionsForDate(
        supabase,
        active.school.id,
        selectedDate,
      ),
      listSchoolAttendanceMarksForDate(
        supabase,
        active.school.id,
        selectedDate,
      ),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Attendance
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load attendance.
        </p>
      </main>
    );
  }

  const daySummary = summarizeSchoolAttendanceDay({
    date: selectedDate,
    sessions: daySessions,
    marks: dayMarks,
  });
  const classRows = buildAttendanceClassRows({
    grades,
    sections,
    enrolments,
    daySessions,
  });

  let activeSession = null;
  let marks: Awaited<ReturnType<typeof listSchoolAttendanceMarks>> = [];
  if (selectedSectionId) {
    try {
      activeSession = await getSchoolAttendanceSession(
        supabase,
        active.school.id,
        selectedSectionId,
        selectedDate,
      );
      if (activeSession) {
        marks = await listSchoolAttendanceMarks(supabase, activeSession.id);
      }
    } catch {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Attendance
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            Could not load the selected attendance session.
          </p>
        </main>
      );
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <SchoolAttendancePanel
        schoolId={active.school.id}
        schoolName={schoolBrandName(active.school)}
        schoolLogoUrl={schoolBrandLogoUrl(active.school)}
        sections={sections}
        grades={grades}
        students={students}
        classRows={classRows}
        sessions={sessions}
        activeSession={activeSession}
        marks={marks}
        selectedSectionId={selectedSectionId}
        selectedDate={selectedDate}
        daySummary={daySummary}
        canManage={canManage}
        canCorrect={canCorrect}
      />
    </main>
  );
}
