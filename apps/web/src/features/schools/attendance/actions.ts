"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateAttendanceMarksInput,
  validateCorrectAttendanceInput,
  validateOpenAttendanceInput,
} from "@/features/schools/attendance/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolAttendanceActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateAttendance(schoolId: string) {
  revalidatePath("/school/attendance");
  revalidatePath(`/school/attendance?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/attendance?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function openSchoolAttendanceSessionAction(
  _prev: SchoolAttendanceActionState,
  formData: FormData,
): Promise<SchoolAttendanceActionState> {
  const validated = validateOpenAttendanceInput({
    schoolId: String(formData.get("school_id") ?? ""),
    sectionId: String(formData.get("section_id") ?? ""),
    attendanceDate: String(formData.get("attendance_date") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { schoolId, sectionId, attendanceDate } = validated.value;
  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "attendance.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("open_school_attendance_session", {
    p_school_id: schoolId,
    p_section_id: sectionId,
    p_attendance_date: attendanceDate,
  });
  if (error) {
    return {
      error: error.message || "Could not open attendance session.",
      success: null,
    };
  }

  revalidateAttendance(schoolId);
  redirect(
    `/school/attendance?school=${encodeURIComponent(schoolId)}&section=${encodeURIComponent(sectionId)}&date=${encodeURIComponent(attendanceDate)}`,
  );
}

export async function saveSchoolAttendanceMarksAction(
  _prev: SchoolAttendanceActionState,
  formData: FormData,
): Promise<SchoolAttendanceActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(sessionId)) {
    return { error: "Session is required.", success: null };
  }

  const studentIds = formData.getAll("student_id").map(String);
  const statuses = formData.getAll("status").map(String);
  const notes = formData.getAll("note").map(String);
  if (
    studentIds.length === 0 ||
    studentIds.length !== statuses.length ||
    studentIds.length !== notes.length
  ) {
    return { error: "Attendance roster is incomplete.", success: null };
  }

  const validated = validateAttendanceMarksInput(
    studentIds.map((studentId, index) => ({
      studentId,
      status: statuses[index] ?? "",
      note: notes[index] ?? "",
    })),
  );
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "attendance.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("save_school_attendance_marks", {
    p_session_id: sessionId,
    p_marks: validated.value.map((mark) => ({
      student_id: mark.studentId,
      status: mark.status,
      note: mark.note,
    })),
  });
  if (error) {
    return {
      error: error.message || "Could not save attendance.",
      success: null,
    };
  }

  revalidateAttendance(schoolId);
  return { error: null, success: "Attendance saved as draft." };
}

export async function submitSchoolAttendanceSessionAction(
  _prev: SchoolAttendanceActionState,
  formData: FormData,
): Promise<SchoolAttendanceActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const sessionId = String(formData.get("session_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(sessionId)) {
    return { error: "Session is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "attendance.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("submit_school_attendance_session", {
    p_session_id: sessionId,
  });
  if (error) {
    return {
      error: error.message || "Could not submit attendance.",
      success: null,
    };
  }

  revalidateAttendance(schoolId);
  return { error: null, success: "Attendance submitted." };
}

export async function correctSchoolAttendanceMarkAction(
  _prev: SchoolAttendanceActionState,
  formData: FormData,
): Promise<SchoolAttendanceActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateCorrectAttendanceInput({
    markId: String(formData.get("mark_id") ?? ""),
    status: String(formData.get("status") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "attendance.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  // Corrections are manager-only at the RPC; app still requires manage.
  const { error } = await supabase.rpc("correct_school_attendance_mark", {
    p_mark_id: validated.value.markId,
    p_status: validated.value.status,
    p_reason: validated.value.reason,
  });
  if (error) {
    return {
      error: error.message || "Could not correct attendance.",
      success: null,
    };
  }

  revalidateAttendance(schoolId);
  return { error: null, success: "Attendance mark corrected." };
}
