"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateGuardianInput,
  validateGuardianLinkInput,
} from "@/features/schools/guardians/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolGuardianActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateGuardians(schoolId: string) {
  revalidatePath("/school/guardians");
  revalidatePath(`/school/guardians?school=${schoolId}`);
  revalidatePath("/school/students");
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/guardians?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolGuardianAction(
  _prev: SchoolGuardianActionState,
  formData: FormData,
): Promise<SchoolGuardianActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateGuardianInput({
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "student.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_guardian", {
    p_school_id: schoolId,
    p_first_name: validated.value.firstName,
    p_last_name: validated.value.lastName,
    p_email: validated.value.email,
    p_phone: validated.value.phone,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage guardians.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create guardian.",
      success: null,
    };
  }

  revalidateGuardians(schoolId);
  return { error: null, success: "Guardian created." };
}

export async function linkSchoolStudentGuardianAction(
  _prev: SchoolGuardianActionState,
  formData: FormData,
): Promise<SchoolGuardianActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateGuardianLinkInput({
    studentId: String(formData.get("student_id") ?? ""),
    guardianId: String(formData.get("guardian_id") ?? ""),
    relationship: String(formData.get("relationship") ?? ""),
    isPrimary: formData.get("is_primary") === "on",
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "student.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("link_school_student_guardian", {
    p_student_id: validated.value.studentId,
    p_guardian_id: validated.value.guardianId,
    p_relationship: validated.value.relationship,
    p_is_primary: validated.value.isPrimary,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage guardians.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("already linked")) {
      return {
        error: "This guardian is already linked to that student.",
        success: null,
      };
    }
    if (error.message?.includes("same school")) {
      return {
        error: "Student and guardian must belong to the same school.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not link guardian.",
      success: null,
    };
  }

  revalidateGuardians(schoolId);
  return { error: null, success: "Guardian linked to student." };
}

export async function unlinkSchoolStudentGuardianAction(
  _prev: SchoolGuardianActionState,
  formData: FormData,
): Promise<SchoolGuardianActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const linkId = String(formData.get("link_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(linkId)) {
    return { error: "Link is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "student.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("unlink_school_student_guardian", {
    p_link_id: linkId,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage guardians.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not unlink guardian.",
      success: null,
    };
  }

  revalidateGuardians(schoolId);
  return { error: null, success: "Guardian link revoked." };
}
