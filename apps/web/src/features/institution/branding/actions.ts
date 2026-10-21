"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateCampusBrandingOverrideInput,
  validateOrganizationBrandingInput,
} from "@/features/institution/branding/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BrandingActionState = {
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

export async function updateOrganizationBrandingAction(
  _prev: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateOrganizationBrandingInput({
    contactEmail: String(formData.get("contact_email") ?? ""),
    contactPhone: String(formData.get("contact_phone") ?? ""),
    websiteUrl: String(formData.get("website_url") ?? ""),
    brandDisplayName: String(formData.get("brand_display_name") ?? ""),
    brandPrimaryColor: String(formData.get("brand_primary_color") ?? ""),
    brandLogoUrl: String(formData.get("brand_logo_url") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireSignedIn();

  try {
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

  const { data, error } = await supabase.rpc("update_organization_branding", {
    p_organization_id: organizationId,
    p_contact_email: validated.value.contactEmail,
    p_contact_phone: validated.value.contactPhone,
    p_website_url: validated.value.websiteUrl,
    p_brand_display_name: validated.value.brandDisplayName,
    p_brand_primary_color: validated.value.brandPrimaryColor,
    p_brand_logo_url: validated.value.brandLogoUrl,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to update branding.",
        success: null,
      };
    }
    if (error.message?.includes("contact email")) {
      return {
        error: "Enter a valid contact email, or leave it blank.",
        success: null,
      };
    }
    if (error.message?.includes("Brand color")) {
      return {
        error: "Brand color must be a #RRGGBB hex value.",
        success: null,
      };
    }
    if (error.message?.includes("Logo URL")) {
      return { error: "Logo URL must be an https URL.", success: null };
    }
    return {
      error: "Could not save branding. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    organization_id?: string;
  } | null;
  if (!row?.organization_id) {
    return {
      error: "Could not save branding. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  return { error: null, success: "Branding and contact details saved." };
}

export async function updateCampusBrandingOverridesAction(
  _prev: BrandingActionState,
  formData: FormData,
): Promise<BrandingActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const campusId = String(formData.get("campus_id") ?? "").trim();
  if (!isUuid(organizationId) || !isUuid(campusId)) {
    return { error: "Campus is required.", success: null };
  }

  const validated = validateCampusBrandingOverrideInput({
    brandDisplayName: String(formData.get("brand_display_name") ?? ""),
    brandPrimaryColor: String(formData.get("brand_primary_color") ?? ""),
    brandLogoUrl: String(formData.get("brand_logo_url") ?? ""),
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

  const { data, error } = await supabase.rpc(
    "update_campus_branding_overrides",
    {
      p_campus_id: campusId,
      p_brand_display_name: validated.value.brandDisplayName,
      p_brand_primary_color: validated.value.brandPrimaryColor,
      p_brand_logo_url: validated.value.brandLogoUrl,
    },
  );

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to update campus branding.",
        success: null,
      };
    }
    return {
      error: "Could not save campus branding overrides. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    campus_id?: string;
    organization_id?: string;
  } | null;
  if (!row?.campus_id) {
    return {
      error: "Could not save campus branding overrides. Please try again.",
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
  return { error: null, success: "Campus branding overrides saved." };
}
