"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateOrganizationProfileInput } from "@/features/institution/profile/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OrganizationProfileActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function updateOrganizationProfileAction(
  _prev: OrganizationProfileActionState,
  formData: FormData,
): Promise<OrganizationProfileActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const name = String(formData.get("name") ?? "");
  const institutionType = String(formData.get("institution_type") ?? "");

  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateOrganizationProfileInput({ name, institutionType });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/auth/sign-in?next=/app/settings`);
  }

  try {
    // organization_id from the form is re-checked via membership + permission.
    await authorize(
      { organizationId, permission: "organization.update" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("update_organization_profile", {
    p_organization_id: organizationId,
    p_name: validated.value.name,
    p_institution_type: validated.value.institutionType,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to update this organization.",
        success: null,
      };
    }
    if (error.message?.includes("Invalid institution_type")) {
      return { error: "Choose school, academy, or both.", success: null };
    }
    if (error.message?.includes("at least 2 characters")) {
      return {
        error: "Enter an organization name with at least 2 characters.",
        success: null,
      };
    }
    return {
      error: "Could not update the organization. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    organization_id?: string;
  } | null;

  if (!row?.organization_id) {
    return {
      error: "Could not update the organization. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");

  return {
    error: null,
    success: "Organization profile saved.",
  };
}
