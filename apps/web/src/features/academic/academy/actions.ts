"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateCohortInput,
  validateCourseInput,
} from "@/features/academic/academy/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AcademyActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireSignedIn() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in?next=/app/setup");
  }
  return { supabase, user };
}

function revalidateSetup() {
  revalidatePath("/app/setup");
  revalidatePath("/app/audit");
}

export async function createCourseAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateCourseInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireSignedIn();
  try {
    await authorize(
      { organizationId, permission: "academic.manage" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_course", {
    p_organization_id: organizationId,
    p_name: validated.value.name,
    p_code: validated.value.code,
    p_description: validated.value.description,
  });

  if (error) {
    if (error.message?.includes("academy or mixed")) {
      return {
        error: "Courses are only available for academy or mixed institutions.",
        success: null,
      };
    }
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage courses.",
        success: null,
      };
    }
    if (error.code === "23505") {
      return {
        error: "A course with that name already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create course.",
      success: null,
    };
  }

  revalidateSetup();
  return { error: null, success: "Course created." };
}

export async function createCohortAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "").trim();
  if (!isUuid(organizationId) || !isUuid(courseId)) {
    return { error: "Course is required.", success: null };
  }

  const academicYearRaw = String(
    formData.get("academic_year_id") ?? "",
  ).trim();
  const academicYearId =
    academicYearRaw && isUuid(academicYearRaw) ? academicYearRaw : null;

  const validated = validateCohortInput({
    name: String(formData.get("name") ?? ""),
    startsOn: String(formData.get("starts_on") ?? ""),
    endsOn: String(formData.get("ends_on") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    status: String(formData.get("status") ?? "planned"),
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireSignedIn();
  try {
    await authorize(
      { organizationId, permission: "academic.manage" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_cohort", {
    p_course_id: courseId,
    p_name: validated.value.name,
    p_starts_on: validated.value.startsOn,
    p_ends_on: validated.value.endsOn,
    p_capacity: validated.value.capacity,
    p_academic_year_id: academicYearId,
    p_status: validated.value.status,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage cohorts.",
        success: null,
      };
    }
    if (error.code === "23505") {
      return {
        error: "A cohort with that name already exists for this course.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create cohort.",
      success: null,
    };
  }

  revalidateSetup();
  return { error: null, success: "Cohort created." };
}
