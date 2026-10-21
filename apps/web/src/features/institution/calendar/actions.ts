"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  validateHolidayInput,
  validateLocaleSettingsInput,
} from "@/features/institution/calendar/validate";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CalendarActionState = {
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

export async function updateLocaleSettingsAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const workingDays = formData
    .getAll("working_days")
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => !Number.isNaN(value));

  const validated = validateLocaleSettingsInput({
    timezone: String(formData.get("timezone") ?? ""),
    locale: String(formData.get("locale") ?? ""),
    workingDays,
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

  const { data, error } = await supabase.rpc(
    "update_organization_locale_settings",
    {
      p_organization_id: organizationId,
      p_timezone: validated.value.timezone,
      p_locale: validated.value.locale,
      p_working_days: validated.value.workingDays,
    },
  );

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to update locale settings.",
        success: null,
      };
    }
    if (error.message?.includes("timezone")) {
      return { error: "Choose a supported timezone.", success: null };
    }
    if (error.message?.includes("locale")) {
      return { error: "Choose English or Urdu.", success: null };
    }
    if (error.message?.includes("working day")) {
      return { error: "Select at least one working day.", success: null };
    }
    return {
      error: "Could not save locale settings. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    organization_id?: string;
  } | null;
  if (!row?.organization_id) {
    return {
      error: "Could not save locale settings. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  return { error: null, success: "Locale and calendar settings saved." };
}

export async function createHolidayAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const validated = validateHolidayInput({
    name: String(formData.get("name") ?? ""),
    holidayDate: String(formData.get("holiday_date") ?? ""),
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

  const { data, error } = await supabase.rpc("create_organization_holiday", {
    p_organization_id: organizationId,
    p_name: validated.value.name,
    p_holiday_date: validated.value.holidayDate,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage holidays.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("organization_holidays_org_date_unique")
    ) {
      return {
        error: "A holiday already exists on that date.",
        success: null,
      };
    }
    return {
      error: "Could not create the holiday. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    holiday_id?: string;
  } | null;
  if (!row?.holiday_id) {
    return {
      error: "Could not create the holiday. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  return { error: null, success: "Holiday added." };
}

export async function deleteHolidayAction(
  _prev: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const holidayId = String(formData.get("holiday_id") ?? "").trim();

  if (!isUuid(organizationId) || !isUuid(holidayId)) {
    return { error: "Holiday is required.", success: null };
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

  const { error } = await supabase.rpc("delete_organization_holiday", {
    p_holiday_id: holidayId,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to manage holidays.",
        success: null,
      };
    }
    if (error.message?.includes("not found")) {
      return { error: "That holiday was not found.", success: null };
    }
    return {
      error: "Could not delete the holiday. Please try again.",
      success: null,
    };
  }

  revalidatePath("/app/settings");
  return { error: null, success: "Holiday removed." };
}
