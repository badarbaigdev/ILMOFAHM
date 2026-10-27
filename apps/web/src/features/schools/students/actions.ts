"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateEnrolmentInput,
  validateStudentInput,
} from "@/features/schools/students/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolStudentActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateStudents(schoolId: string) {
  revalidatePath("/school/students");
  revalidatePath(`/school/students?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/students?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolStudentAction(
  _prev: SchoolStudentActionState,
  formData: FormData,
): Promise<SchoolStudentActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateStudentInput({
    studentNumber: String(formData.get("student_number") ?? ""),
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    dateOfBirth: String(formData.get("date_of_birth") ?? ""),
    gender: String(formData.get("gender") ?? ""),
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

  const { error } = await supabase.rpc("create_school_student", {
    p_school_id: schoolId,
    p_student_number: validated.value.studentNumber,
    p_first_name: validated.value.firstName,
    p_last_name: validated.value.lastName,
    p_date_of_birth: validated.value.dateOfBirth,
    p_gender: validated.value.gender,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage students.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "A student with that number already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create student.",
      success: null,
    };
  }

  revalidateStudents(schoolId);
  return { error: null, success: "Student created." };
}

export async function createSchoolEnrolmentAction(
  _prev: SchoolStudentActionState,
  formData: FormData,
): Promise<SchoolStudentActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateEnrolmentInput({
    studentId: String(formData.get("student_id") ?? ""),
    academicYearId: String(formData.get("academic_year_id") ?? ""),
    gradeId: String(formData.get("grade_id") ?? ""),
    sectionId: String(formData.get("section_id") ?? ""),
    enrolledOn: String(formData.get("enrolled_on") ?? ""),
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

  const { error } = await supabase.rpc("create_school_enrolment", {
    p_student_id: validated.value.studentId,
    p_academic_year_id: validated.value.academicYearId,
    p_grade_id: validated.value.gradeId,
    p_section_id: validated.value.sectionId,
    p_enrolled_on: validated.value.enrolledOn,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage enrolments.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("already has an active enrolment")
    ) {
      return {
        error: "This student already has an active enrolment for that year.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create enrolment.",
      success: null,
    };
  }

  revalidateStudents(schoolId);
  return { error: null, success: "Student enrolled." };
}

export async function withdrawSchoolEnrolmentAction(
  _prev: SchoolStudentActionState,
  formData: FormData,
): Promise<SchoolStudentActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const enrolmentId = String(formData.get("enrolment_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(enrolmentId)) {
    return { error: "Enrolment is required.", success: null };
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

  const { error } = await supabase.rpc("withdraw_school_enrolment", {
    p_enrolment_id: enrolmentId,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage enrolments.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not withdraw enrolment.",
      success: null,
    };
  }

  revalidateStudents(schoolId);
  return { error: null, success: "Enrolment withdrawn." };
}

export async function updateSchoolStudentAction(
  _prev: SchoolStudentActionState,
  formData: FormData,
): Promise<SchoolStudentActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(studentId)) {
    return { error: "Student is required.", success: null };
  }

  const validated = validateStudentInput({
    studentNumber: String(formData.get("student_number") ?? ""),
    firstName: String(formData.get("first_name") ?? ""),
    lastName: String(formData.get("last_name") ?? ""),
    dateOfBirth: String(formData.get("date_of_birth") ?? ""),
    gender: String(formData.get("gender") ?? ""),
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

  let photoUrl = String(formData.get("photo_url") ?? "").trim() || null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const { uploadSchoolMedia } = await import("@/features/schools/media/upload");
    const uploaded = await uploadSchoolMedia({
      supabase,
      schoolId,
      kind: "students",
      file: photo,
    });
    if (!uploaded.ok) {
      return { error: uploaded.error, success: null };
    }
    photoUrl = uploaded.publicUrl;
  }

  const { error } = await supabase.rpc("update_school_student", {
    p_student_id: studentId,
    p_student_number: validated.value.studentNumber,
    p_first_name: validated.value.firstName,
    p_last_name: validated.value.lastName,
    p_date_of_birth: validated.value.dateOfBirth,
    p_gender: validated.value.gender,
    p_photo_url: photoUrl,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage students.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not update student.",
      success: null,
    };
  }

  revalidateStudents(schoolId);
  revalidatePath(`/school/students/${studentId}`);
  return { error: null, success: "Student profile saved." };
}
