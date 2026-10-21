"use server";

import { headers } from "next/headers";

import {
  buildRegistrationRateLimitKey,
  checkRateLimit,
} from "@/features/school-applications/rate-limit";
import type { SubmitSchoolApplicationState } from "@/features/school-applications/types";
import {
  schoolApplicationFromFormData,
  validateSchoolApplicationInput,
} from "@/features/school-applications/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type { SubmitSchoolApplicationState };

function clientIpFromHeaders(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerStore.get("x-real-ip");
}

/**
 * Public school registration. Creates a pending school_applications row.
 * Does not create a school tenant. Privileged columns are forced pending/null
 * by database triggers for non-operators.
 */
export async function submitSchoolApplicationAction(
  _prev: SubmitSchoolApplicationState,
  formData: FormData,
): Promise<SubmitSchoolApplicationState> {
  const raw = schoolApplicationFromFormData(formData);
  const validated = validateSchoolApplicationInput(raw);

  if (!validated.ok) {
    return {
      error: validated.error,
      success: null,
      fieldErrors: validated.fieldErrors,
    };
  }

  const headerStore = await headers();
  const rateKey = buildRegistrationRateLimitKey({
    ip: clientIpFromHeaders(headerStore),
    email: validated.value.applicantEmail,
  });
  const rate = checkRateLimit(rateKey);
  if (!rate.allowed) {
    return {
      error: `Too many submissions. Please wait about ${rate.retryAfterSeconds} seconds and try again.`,
      success: null,
      fieldErrors: {},
    };
  }

  const supabase = await createServerSupabaseClient();

  // Only public-safe columns. Never send status/reviewer/provisioning fields.
  const { error } = await supabase.from("school_applications").insert({
    school_name: validated.value.schoolName,
    applicant_name: validated.value.applicantName,
    applicant_email: validated.value.applicantEmail,
    phone: validated.value.phone,
    city: validated.value.city,
    country_code: validated.value.countryCode,
    institution_type: validated.value.institutionType,
    message: validated.value.message,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "An open application for this school and email already exists. A platform administrator will review it — you do not need to submit again.",
        success: null,
        fieldErrors: {},
      };
    }

    return {
      error:
        "Could not save your application. Please try again in a few minutes.",
      success: null,
      fieldErrors: {},
    };
  }

  return {
    error: null,
    success:
      "Your school application was received and is pending review. It is not an active school yet — a platform administrator will follow up.",
    fieldErrors: {},
  };
}
