"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateGradeInput,
  validateSectionInput,
  validateSubjectInput,
} from "@/features/academic/school/validate";
import {
  validateAcademicTermInput,
  validateAcademicYearInput,
} from "@/features/academic/years/validate";
import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolAcademicActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateAcademic(schoolId: string) {
  revalidatePath("/school/academic");
  revalidatePath(`/school/academic?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/academic?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolAcademicYearAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateAcademicYearInput({
    name: String(formData.get("name") ?? ""),
    startsOn: String(formData.get("starts_on") ?? ""),
    endsOn: String(formData.get("ends_on") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    makeCurrent: formData.get("make_current") === "on",
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

  const { error } = await supabase.rpc("create_school_academic_year", {
    p_school_id: schoolId,
    p_name: validated.value.name,
    p_starts_on: validated.value.startsOn,
    p_ends_on: validated.value.endsOn,
    p_status: validated.value.status,
    p_make_current: validated.value.makeCurrent,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage academic years.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "An academic year with that name already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create academic year.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Academic year created." };
}

export async function updateSchoolAcademicYearAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const academicYearId = String(
    formData.get("academic_year_id") ?? "",
  ).trim();
  if (!isUuid(schoolId) || !isUuid(academicYearId)) {
    return { error: "Academic year is required.", success: null };
  }

  const validated = validateAcademicYearInput({
    name: String(formData.get("name") ?? ""),
    startsOn: String(formData.get("starts_on") ?? ""),
    endsOn: String(formData.get("ends_on") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    makeCurrent: formData.get("make_current") === "on",
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

  const { error } = await supabase.rpc("update_school_academic_year", {
    p_academic_year_id: academicYearId,
    p_name: validated.value.name,
    p_starts_on: validated.value.startsOn,
    p_ends_on: validated.value.endsOn,
    p_status: validated.value.status,
    p_make_current: validated.value.makeCurrent,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage academic years.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "An academic year with that name already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not update academic year.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Academic year updated." };
}

export async function createSchoolAcademicTermAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const academicYearId = String(
    formData.get("academic_year_id") ?? "",
  ).trim();
  if (!isUuid(schoolId) || !isUuid(academicYearId)) {
    return { error: "Academic year is required.", success: null };
  }

  const validated = validateAcademicTermInput({
    name: String(formData.get("name") ?? ""),
    startsOn: String(formData.get("starts_on") ?? ""),
    endsOn: String(formData.get("ends_on") ?? ""),
    sortOrder: String(formData.get("sort_order") ?? "1"),
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

  const { error } = await supabase.rpc("create_school_academic_term", {
    p_academic_year_id: academicYearId,
    p_name: validated.value.name,
    p_starts_on: validated.value.startsOn,
    p_ends_on: validated.value.endsOn,
    p_sort_order: validated.value.sortOrder,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage academic terms.",
        success: null,
      };
    }
    if (error.message?.includes("fall within")) {
      return {
        error: "Term dates must fall within the academic year.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "A term with that name already exists for this year.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create term.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Term created." };
}

export async function createSchoolGradeAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateGradeInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sort_order") ?? "1"),
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

  const { error } = await supabase.rpc("create_school_grade", {
    p_school_id: schoolId,
    p_name: validated.value.name,
    p_code: validated.value.code,
    p_sort_order: validated.value.sortOrder,
  });

  if (error) {
    if (error.message?.includes("school or mixed")) {
      return {
        error: "Grades are only available for school or mixed institutions.",
        success: null,
      };
    }
    if (error.message?.includes("Not authorized")) {
      return { error: "You are not allowed to manage grades.", success: null };
    }
    if (error.code === "23505") {
      return { error: "A grade with that name already exists.", success: null };
    }
    return { error: error.message || "Could not create grade.", success: null };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Grade created." };
}

export async function createSchoolSectionAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gradeId = String(formData.get("grade_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(gradeId)) {
    return { error: "Grade is required.", success: null };
  }

  const validated = validateSectionInput({
    name: String(formData.get("name") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
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

  const { error } = await supabase.rpc("create_school_section", {
    p_grade_id: gradeId,
    p_name: validated.value.name,
    p_capacity: validated.value.capacity,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage sections.",
        success: null,
      };
    }
    if (error.code === "23505") {
      return {
        error: "A section with that name already exists for this grade.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create section.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Section created." };
}

export async function createSchoolSubjectAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateSubjectInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
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

  const { error } = await supabase.rpc("create_school_subject", {
    p_school_id: schoolId,
    p_name: validated.value.name,
    p_code: validated.value.code,
  });

  if (error) {
    if (error.message?.includes("school or mixed")) {
      return {
        error: "Subjects are only available for school or mixed institutions.",
        success: null,
      };
    }
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage subjects.",
        success: null,
      };
    }
    if (error.code === "23505") {
      return {
        error: "A subject with that name already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create subject.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Subject created." };
}

export async function archiveSchoolGradeAction(
  _prev: SchoolAcademicActionState,
  formData: FormData,
): Promise<SchoolAcademicActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gradeId = String(formData.get("grade_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(gradeId)) {
    return { error: "Grade is required.", success: null };
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

  const { error } = await supabase.rpc("archive_school_grade", {
    p_grade_id: gradeId,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return { error: "You are not allowed to manage grades.", success: null };
    }
    return {
      error: error.message || "Could not archive grade.",
      success: null,
    };
  }

  revalidateAcademic(schoolId);
  return { error: null, success: "Grade archived." };
}
