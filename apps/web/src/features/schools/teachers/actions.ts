"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateTeacherId,
  validateTeacherInput,
} from "@/features/schools/teachers/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolTeacherActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateTeachers(schoolId: string) {
  revalidatePath("/school/teachers");
  revalidatePath(`/school/teachers?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/teachers?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolTeacherAction(
  _prev: SchoolTeacherActionState,
  formData: FormData,
): Promise<SchoolTeacherActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateTeacherInput({
    staffNumber: String(formData.get("staff_number") ?? ""),
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    primarySubject: String(formData.get("primary_subject") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "teacher.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_teacher", {
    p_school_id: schoolId,
    p_staff_number: validated.value.staffNumber,
    p_first_name: validated.value.firstName,
    p_last_name: validated.value.lastName,
    p_email: validated.value.email,
    p_phone: validated.value.phone,
    p_primary_subject: validated.value.primarySubject,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage teachers.",
        success: null,
      };
    }
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return {
        error: "A teacher with this staff number already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create teacher.",
      success: null,
    };
  }

  revalidateTeachers(schoolId);
  return { error: null, success: "Teacher created." };
}

export async function archiveSchoolTeacherAction(
  _prev: SchoolTeacherActionState,
  formData: FormData,
): Promise<SchoolTeacherActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const teacherValidated = validateTeacherId(
    String(formData.get("teacher_id") ?? ""),
  );
  if (!teacherValidated.ok) {
    return { error: teacherValidated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "teacher.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("archive_school_teacher", {
    p_teacher_id: teacherValidated.value,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage teachers.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not archive teacher.",
      success: null,
    };
  }

  revalidateTeachers(schoolId);
  return { error: null, success: "Teacher archived." };
}

export async function updateSchoolTeacherAction(
  _prev: SchoolTeacherActionState,
  formData: FormData,
): Promise<SchoolTeacherActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(teacherId)) {
    return { error: "Teacher is required.", success: null };
  }

  const validated = validateTeacherInput({
    staffNumber: String(formData.get("staff_number") ?? ""),
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    primarySubject: String(formData.get("primary_subject") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "teacher.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  let photoUrl = String(formData.get("photo_url") ?? "").trim() || null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const { uploadSchoolMedia } = await import("@/features/schools/media/upload");
    const uploaded = await uploadSchoolMedia({
      supabase,
      schoolId,
      kind: "teachers",
      file: photo,
    });
    if (!uploaded.ok) {
      return { error: uploaded.error, success: null };
    }
    photoUrl = uploaded.publicUrl;
  }

  const { error } = await supabase.rpc("update_school_teacher", {
    p_teacher_id: teacherId,
    p_staff_number: validated.value.staffNumber,
    p_first_name: validated.value.firstName,
    p_last_name: validated.value.lastName,
    p_email: validated.value.email,
    p_phone: validated.value.phone,
    p_primary_subject: validated.value.primarySubject,
    p_photo_url: photoUrl,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage teachers.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not update teacher.",
      success: null,
    };
  }

  revalidateTeachers(schoolId);
  revalidatePath(`/school/teachers/${teacherId}`);
  return { error: null, success: "Teacher profile saved." };
}
