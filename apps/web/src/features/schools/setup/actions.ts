"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isSchoolAuthorizationError,
  requireSchoolManager,
} from "@/features/schools/authorization";
import { validateOrganizationBrandingInput } from "@/features/institution/branding/validate";
import {
  validateHolidayInput,
  validateLocaleSettingsInput,
} from "@/features/institution/calendar/validate";
import { validateCampusProfileInput } from "@/features/institution/campuses/validate";
import { validateSchoolProfileInput } from "@/features/schools/setup/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolSetupActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateSchool(schoolId: string) {
  revalidatePath("/school");
  revalidatePath("/school/setup");
  revalidatePath("/school/settings");
  revalidatePath(`/school?school=${schoolId}`);
  revalidatePath(`/school/setup?school=${schoolId}`);
  revalidatePath(`/school/settings?school=${schoolId}`);
}

async function requireManagerForSchool(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=/school/setup?school=${schoolId}`);
  }
  await requireSchoolManager(supabase, user.id, schoolId);
  return { supabase, user };
}

export async function updateSchoolProfileAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateSchoolProfileInput({
    name: String(formData.get("name") ?? ""),
    institutionType: String(formData.get("institution_type") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine1: String(formData.get("address_line1") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    countryCode: String(formData.get("country_code") ?? "PK"),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("update_school_profile", {
      p_school_id: schoolId,
      p_name: validated.value.name,
      p_institution_type: validated.value.institutionType,
      p_email: validated.value.email,
      p_phone: validated.value.phone,
      p_address_line1: validated.value.addressLine1,
      p_city: validated.value.city,
      p_region: validated.value.region,
      p_country_code: validated.value.countryCode,
    });
    if (error) {
      return {
        error: error.message.includes("Not authorized")
          ? "You are not allowed to update this school."
          : "Could not save the school profile.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "School profile saved." };
}

export async function updateSchoolBrandingAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  let brandLogoUrl = String(formData.get("brand_logo_url") ?? "").trim();
  const logoFile = formData.get("logo_file");

  try {
    const { supabase } = await requireManagerForSchool(schoolId);

    if (logoFile instanceof File && logoFile.size > 0) {
      const { uploadSchoolMedia } = await import(
        "@/features/schools/media/upload"
      );
      const uploaded = await uploadSchoolMedia({
        supabase,
        schoolId,
        kind: "logo",
        file: logoFile,
      });
      if (!uploaded.ok) {
        return { error: uploaded.error, success: null };
      }
      brandLogoUrl = uploaded.publicUrl;
    }

    const validated = validateOrganizationBrandingInput({
      websiteUrl: String(formData.get("website_url") ?? ""),
      brandDisplayName: String(formData.get("brand_display_name") ?? ""),
      brandPrimaryColor: String(formData.get("brand_primary_color") ?? ""),
      brandLogoUrl,
    });
    if (!validated.ok) {
      return { error: validated.error, success: null };
    }

    const { error } = await supabase.rpc("update_school_branding", {
      p_school_id: schoolId,
      p_website_url: validated.value.websiteUrl,
      p_brand_display_name: validated.value.brandDisplayName,
      p_brand_primary_color: validated.value.brandPrimaryColor,
      p_brand_logo_url: validated.value.brandLogoUrl,
    });
    if (error) {
      return { error: "Could not save branding.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Branding saved." };
}

export async function updateSchoolLocaleAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const workingDays = formData
    .getAll("working_days")
    .map((v) => Number(String(v)))
    .filter((n) => Number.isInteger(n));

  const validated = validateLocaleSettingsInput({
    timezone: String(formData.get("timezone") ?? ""),
    locale: String(formData.get("default_locale") ?? ""),
    workingDays,
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("update_school_locale_settings", {
      p_school_id: schoolId,
      p_timezone: validated.value.timezone,
      p_default_locale: validated.value.locale,
      p_working_days: validated.value.workingDays,
    });
    if (error) {
      return { error: "Could not save locale settings.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Locale and calendar settings saved." };
}

export async function createSchoolHolidayAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateHolidayInput({
    name: String(formData.get("name") ?? ""),
    holidayDate: String(formData.get("holiday_date") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("create_school_holiday", {
      p_school_id: schoolId,
      p_name: validated.value.name,
      p_holiday_date: validated.value.holidayDate,
    });
    if (error) {
      if (error.message?.includes("unique")) {
        return {
          error: "A holiday already exists on that date.",
          success: null,
        };
      }
      return { error: "Could not add the holiday.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Holiday added." };
}

export async function deleteSchoolHolidayAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const holidayId = String(formData.get("holiday_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(holidayId)) {
    return { error: "Holiday is required.", success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("delete_school_holiday", {
      p_holiday_id: holidayId,
    });
    if (error) {
      return { error: "Could not delete the holiday.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Holiday removed." };
}

export async function createSchoolCampusAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateCampusProfileInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    addressLine: String(formData.get("address_line1") ?? ""),
    status: "active",
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("create_school_campus", {
      p_school_id: schoolId,
      p_name: validated.value.name,
      p_code: validated.value.code,
      p_phone: validated.value.phone,
      p_email: validated.value.email,
      p_address_line1: validated.value.addressLine,
      p_city: optionalCity(formData),
    });
    if (error) {
      return { error: "Could not create the campus.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Campus created." };
}

export async function updateSchoolCampusAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const campusId = String(formData.get("campus_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(campusId)) {
    return { error: "Campus is required.", success: null };
  }

  const validated = validateCampusProfileInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    addressLine: String(formData.get("address_line1") ?? ""),
    status: String(formData.get("status") ?? "active"),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { error } = await supabase.rpc("update_school_campus", {
      p_campus_id: campusId,
      p_name: validated.value.name,
      p_code: validated.value.code,
      p_phone: validated.value.phone,
      p_email: validated.value.email,
      p_address_line1: validated.value.addressLine,
      p_city: optionalCity(formData),
      p_status: validated.value.status,
    });
    if (error) {
      return { error: "Could not update the campus.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  return { error: null, success: "Campus updated." };
}

function optionalCity(formData: FormData): string | null {
  const city = String(formData.get("city") ?? "").trim();
  return city.length > 0 ? city : null;
}

export async function completeSchoolSetupAction(
  _prev: SchoolSetupActionState,
  formData: FormData,
): Promise<SchoolSetupActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  try {
    const { supabase } = await requireManagerForSchool(schoolId);
    const { data, error } = await supabase.rpc("complete_school_setup", {
      p_school_id: schoolId,
    });
    if (error) {
      if (error.message?.includes("campus")) {
        return {
          error: "Add at least one active campus before completing setup.",
          success: null,
        };
      }
      if (error.message?.includes("timezone") || error.message?.includes("locale")) {
        return {
          error: "Save timezone and locale settings before completing setup.",
          success: null,
        };
      }
      if (error.message?.includes("name") || error.message?.includes("Institution")) {
        return {
          error: "Save the school profile before completing setup.",
          success: null,
        };
      }
      if (error.message?.includes("cannot complete setup")) {
        return {
          error: "This school cannot complete setup in its current status.",
          success: null,
        };
      }
      return { error: "Could not complete school setup.", success: null };
    }

    const row = (Array.isArray(data) ? data[0] : data) as {
      status?: string;
    } | null;
    if (!row?.status) {
      return { error: "Could not complete school setup.", success: null };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  revalidateSchool(schoolId);
  redirect(`/school?school=${schoolId}`);
}
