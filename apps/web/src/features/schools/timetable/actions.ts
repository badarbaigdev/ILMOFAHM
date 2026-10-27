"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { validateTimetableEntryInput } from "@/features/schools/timetable/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolTimetableActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateTimetable(schoolId: string) {
  revalidatePath("/school/timetable");
  revalidatePath(`/school/timetable?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/timetable?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

function mapConflictError(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes("class already has")) return message;
  if (message.includes("teacher already has")) return message;
  if (message.includes("classroom is already")) return message;
  if (message.includes("Not authorized")) {
    return "You are not allowed to manage timetables.";
  }
  return null;
}

export async function createSchoolRoomAction(
  _prev: SchoolTimetableActionState,
  formData: FormData,
): Promise<SchoolTimetableActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }
  if (!name) {
    return { error: "Classroom name is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "academic.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_room", {
    p_school_id: schoolId,
    p_name: name,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "A classroom with that name already exists.",
        success: null,
      };
    }
    return {
      error: mapConflictError(error.message) || error.message || "Could not create classroom.",
      success: null,
    };
  }

  revalidateTimetable(schoolId);
  return { error: null, success: "Classroom created." };
}

export async function createSchoolTimetableEntryAction(
  _prev: SchoolTimetableActionState,
  formData: FormData,
): Promise<SchoolTimetableActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateTimetableEntryInput({
    sectionId: String(formData.get("section_id") ?? ""),
    subjectId: String(formData.get("subject_id") ?? ""),
    teacherId: String(formData.get("teacher_id") ?? ""),
    roomId: String(formData.get("room_id") ?? ""),
    dayOfWeek: String(formData.get("day_of_week") ?? ""),
    startsAt: String(formData.get("starts_at") ?? ""),
    endsAt: String(formData.get("ends_at") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "academic.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_timetable_entry", {
    p_school_id: schoolId,
    p_section_id: validated.value.sectionId,
    p_subject_id: validated.value.subjectId,
    p_teacher_id: validated.value.teacherId,
    p_room_id: validated.value.roomId,
    p_day_of_week: validated.value.dayOfWeek,
    p_starts_at: validated.value.startsAt,
    p_ends_at: validated.value.endsAt,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error:
        mapConflictError(error.message) ||
        error.message ||
        "Could not create timetable period.",
      success: null,
    };
  }

  revalidateTimetable(schoolId);
  return { error: null, success: "Period added to timetable." };
}

export async function updateSchoolTimetableEntryAction(
  _prev: SchoolTimetableActionState,
  formData: FormData,
): Promise<SchoolTimetableActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const entryId = String(formData.get("entry_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(entryId)) {
    return { error: "Period is required.", success: null };
  }

  const validated = validateTimetableEntryInput({
    sectionId: String(formData.get("section_id") ?? ""),
    subjectId: String(formData.get("subject_id") ?? ""),
    teacherId: String(formData.get("teacher_id") ?? ""),
    roomId: String(formData.get("room_id") ?? ""),
    dayOfWeek: String(formData.get("day_of_week") ?? ""),
    startsAt: String(formData.get("starts_at") ?? ""),
    endsAt: String(formData.get("ends_at") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "academic.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("update_school_timetable_entry", {
    p_entry_id: entryId,
    p_section_id: validated.value.sectionId,
    p_subject_id: validated.value.subjectId,
    p_teacher_id: validated.value.teacherId,
    p_room_id: validated.value.roomId,
    p_day_of_week: validated.value.dayOfWeek,
    p_starts_at: validated.value.startsAt,
    p_ends_at: validated.value.endsAt,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error:
        mapConflictError(error.message) ||
        error.message ||
        "Could not update timetable period.",
      success: null,
    };
  }

  revalidateTimetable(schoolId);
  return { error: null, success: "Period updated." };
}

export async function deleteSchoolTimetableEntryAction(
  _prev: SchoolTimetableActionState,
  formData: FormData,
): Promise<SchoolTimetableActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const entryId = String(formData.get("entry_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(entryId)) {
    return { error: "Period is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "academic.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("delete_school_timetable_entry", {
    p_entry_id: entryId,
  });

  if (error) {
    return {
      error:
        mapConflictError(error.message) ||
        error.message ||
        "Could not remove timetable period.",
      success: null,
    };
  }

  revalidateTimetable(schoolId);
  return { error: null, success: "Period removed." };
}
