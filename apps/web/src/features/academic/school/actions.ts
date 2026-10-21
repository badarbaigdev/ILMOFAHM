"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateGradeInput,
  validateSectionInput,
  validateSubjectInput,
} from "@/features/academic/school/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolActionState = {
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

export async function createGradeAction(
  _prev: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateGradeInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    sortOrder: String(formData.get("sort_order") ?? "1"),
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

  const { error } = await supabase.rpc("create_grade", {
    p_organization_id: organizationId,
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

  revalidateSetup();
  return { error: null, success: "Grade created." };
}

export async function createSectionAction(
  _prev: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const gradeId = String(formData.get("grade_id") ?? "").trim();
  if (!isUuid(organizationId) || !isUuid(gradeId)) {
    return { error: "Grade is required.", success: null };
  }

  const validated = validateSectionInput({
    name: String(formData.get("name") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
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

  const { error } = await supabase.rpc("create_section", {
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
        error: "A section with that name already exists in this grade.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create section.",
      success: null,
    };
  }

  revalidateSetup();
  return { error: null, success: "Section created." };
}

export async function createSubjectAction(
  _prev: SchoolActionState,
  formData: FormData,
): Promise<SchoolActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateSubjectInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
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

  const { error } = await supabase.rpc("create_subject", {
    p_organization_id: organizationId,
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

  revalidateSetup();
  return { error: null, success: "Subject created." };
}
