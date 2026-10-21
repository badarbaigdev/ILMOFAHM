"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateCampusProfileInput } from "@/features/institution/campuses/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CampusActionState = {
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
    redirect("/auth/sign-in?next=/app/settings");
  }
  return { supabase, user };
}

export async function createCampusAction(
  _prev: CampusActionState,
  formData: FormData,
): Promise<CampusActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateCampusProfileInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    addressLine: String(formData.get("address_line") ?? ""),
    status: "active",
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireSignedIn();

  try {
    await authorize(
      { organizationId, permission: "campus.manage" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("create_organization_campus", {
    p_organization_id: organizationId,
    p_name: validated.value.name,
    p_code: validated.value.code,
    p_phone: validated.value.phone,
    p_email: validated.value.email,
    p_address_line: validated.value.addressLine,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage campuses in this organization.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("campuses_org_name_unique") ||
      error.message?.includes("campuses_org_code_unique")
    ) {
      return {
        error: "A campus with that name or code already exists.",
        success: null,
      };
    }
    if (error.message?.includes("Valid campus email")) {
      return {
        error: "Enter a valid campus email, or leave it blank.",
        success: null,
      };
    }
    return {
      error: "Could not create the campus. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    campus_id?: string;
  } | null;
  if (!row?.campus_id) {
    return {
      error: "Could not create the campus. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { error: null, success: "Campus created." };
}

export async function updateCampusAction(
  _prev: CampusActionState,
  formData: FormData,
): Promise<CampusActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const campusId = String(formData.get("campus_id") ?? "").trim();

  if (!isUuid(organizationId) || !isUuid(campusId)) {
    return { error: "Campus is required.", success: null };
  }

  const validated = validateCampusProfileInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    addressLine: String(formData.get("address_line") ?? ""),
    status: String(formData.get("status") ?? "active"),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireSignedIn();

  try {
    // Org membership + campus.manage; RPC re-checks manager on the campus org.
    await authorize(
      { organizationId, permission: "campus.manage" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("update_organization_campus", {
    p_campus_id: campusId,
    p_name: validated.value.name,
    p_code: validated.value.code,
    p_phone: validated.value.phone,
    p_email: validated.value.email,
    p_address_line: validated.value.addressLine,
    p_status: validated.value.status,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage campuses in this organization.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("campuses_org_name_unique") ||
      error.message?.includes("campuses_org_code_unique")
    ) {
      return {
        error: "A campus with that name or code already exists.",
        success: null,
      };
    }
    return {
      error: "Could not update the campus. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    campus_id?: string;
    organization_id?: string;
  } | null;

  if (!row?.campus_id) {
    return {
      error: "Could not update the campus. Please try again.",
      success: null,
    };
  }
  if (row.organization_id && row.organization_id !== organizationId) {
    return {
      error: "Campus is not available in this organization.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { error: null, success: "Campus saved." };
}
