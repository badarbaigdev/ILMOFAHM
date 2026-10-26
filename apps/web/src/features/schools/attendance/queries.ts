import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolAttendanceSessionRow = {
  id: string;
  schoolId: string;
  sectionId: string;
  attendanceDate: string;
  status: string;
  submittedAt: string | null;
};

export type SchoolAttendanceMarkRow = {
  id: string;
  schoolId: string;
  sessionId: string;
  studentId: string;
  status: string;
  note: string | null;
};

export async function listSchoolAttendanceSessions(
  supabase: SupabaseClient,
  schoolId: string,
  limit = 30,
): Promise<SchoolAttendanceSessionRow[]> {
  const { data, error } = await supabase
    .from("school_attendance_sessions")
    .select(
      "id, school_id, section_id, attendance_date, status, submitted_at",
    )
    .eq("school_id", schoolId)
    .order("attendance_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Could not load attendance sessions.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    sectionId: row.section_id,
    attendanceDate: row.attendance_date,
    status: row.status,
    submittedAt: row.submitted_at,
  }));
}

export async function getSchoolAttendanceSession(
  supabase: SupabaseClient,
  schoolId: string,
  sectionId: string,
  attendanceDate: string,
): Promise<SchoolAttendanceSessionRow | null> {
  const { data, error } = await supabase
    .from("school_attendance_sessions")
    .select(
      "id, school_id, section_id, attendance_date, status, submitted_at",
    )
    .eq("school_id", schoolId)
    .eq("section_id", sectionId)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load attendance session.");
  }
  if (!data) {
    return null;
  }

  return {
    id: data.id,
    schoolId: data.school_id,
    sectionId: data.section_id,
    attendanceDate: data.attendance_date,
    status: data.status,
    submittedAt: data.submitted_at,
  };
}

export async function listSchoolAttendanceMarks(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<SchoolAttendanceMarkRow[]> {
  const { data, error } = await supabase
    .from("school_attendance_marks")
    .select("id, school_id, session_id, student_id, status, note")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load attendance marks.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    sessionId: row.session_id,
    studentId: row.student_id,
    status: row.status,
    note: row.note,
  }));
}
