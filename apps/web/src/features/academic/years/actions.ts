"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateAcademicTermInput,
  validateAcademicYearInput,
} from "@/features/academic/years/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AcademicActionState = {
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

function revalidateSetupPaths() {
  revalidatePath("/app/setup");
  revalidatePath("/app/settings");
  revalidatePath("/app/audit");
}

export async function createAcademicYearAction(
  _prev: AcademicActionState,
  formData: FormData,
): Promise<AcademicActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
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

  const { error } = await supabase.rpc("create_academic_year", {
    p_organization_id: organizationId,
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

  revalidateSetupPaths();
  return { error: null, success: "Academic year created." };
}

export async function updateAcademicYearAction(
  _prev: AcademicActionState,
  formData: FormData,
): Promise<AcademicActionState> {
  const yearId = String(formData.get("academic_year_id") ?? "").trim();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(yearId) || !isUuid(organizationId)) {
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

  const { error } = await supabase.rpc("update_academic_year", {
    p_academic_year_id: yearId,
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
    if (error.message?.includes("not found")) {
      return { error: "Academic year not found.", success: null };
    }
    return {
      error: error.message || "Could not update academic year.",
      success: null,
    };
  }

  revalidateSetupPaths();
  return { error: null, success: "Academic year updated." };
}

export async function createAcademicTermAction(
  _prev: AcademicActionState,
  formData: FormData,
): Promise<AcademicActionState> {
  const yearId = String(formData.get("academic_year_id") ?? "").trim();
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(yearId) || !isUuid(organizationId)) {
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

  const { error } = await supabase.rpc("create_academic_term", {
    p_academic_year_id: yearId,
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
    if (error.message?.includes("within the academic year")) {
      return {
        error: "Term dates must fall within the academic year.",
        success: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("unique")) {
      return {
        error: "A term with that name already exists in this year.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create term.",
      success: null,
    };
  }

  revalidateSetupPaths();
  return { error: null, success: "Term created." };
}
