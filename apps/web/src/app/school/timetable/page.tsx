import { redirect } from "next/navigation";

import {
  listSchoolGrades,
  listSchoolSections,
  listSchoolSubjects,
} from "@/features/schools/academic/queries";
import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { schoolBrandLogoUrl, schoolBrandName } from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import { listSchoolTeachers } from "@/features/schools/teachers/queries";
import {
  listSchoolRooms,
  listSchoolTimetableEntries,
} from "@/features/schools/timetable/queries";
import { SchoolTimetablePanel } from "@/features/schools/timetable/timetable-panel";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    school?: string;
    section?: string;
    teacher?: string;
  }>;
};

export default async function SchoolTimetablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const initialSectionId = params.section?.trim() ?? "";
  const initialTeacherId = params.teacher?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/timetable?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/timetable";
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
        <h1 className="text-2xl font-semibold text-ink">Timetable</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load timetable.
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
        <h1 className="text-2xl font-semibold text-ink">Timetable</h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view timetables.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "academic.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold text-ink">Timetable</h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view timetables for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  let grades;
  let sections;
  let subjects;
  let teachers;
  let rooms;
  let entries;
  try {
    [grades, sections, subjects, teachers, rooms, entries] = await Promise.all([
      listSchoolGrades(supabase, active.school.id),
      listSchoolSections(supabase, active.school.id),
      listSchoolSubjects(supabase, active.school.id),
      listSchoolTeachers(supabase, active.school.id),
      listSchoolRooms(supabase, active.school.id),
      listSchoolTimetableEntries(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Timetable</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load timetable data.
        </p>
      </main>
    );
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "academic.manage",
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <SchoolTimetablePanel
        schoolId={active.school.id}
        schoolName={schoolBrandName(active.school)}
        schoolLogoUrl={schoolBrandLogoUrl(active.school)}
        grades={grades}
        sections={sections}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        entries={entries}
        canManage={canManage}
        initialSectionId={initialSectionId}
        initialTeacherId={initialTeacherId}
      />
    </main>
  );
}
