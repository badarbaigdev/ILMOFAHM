"use server";

import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import {
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from "@/features/platform/onboarding/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error: string | null;
  success: string | null;
};

const INSTITUTION_TYPES = new Set(["school", "academy", "both"]);

type ProvisionRow = {
  organization_id: string;
  campus_id: string;
  membership_id: string;
  already_provisioned: boolean;
};

export async function provisionOrganizationAction(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const institutionType = String(formData.get("institution_type") ?? "").trim();
  const campusName =
    String(formData.get("campus_name") ?? "").trim() || "Main campus";
  const idempotencyKey = String(formData.get("idempotency_key") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput || slugifyOrganizationName(name);

  if (name.length < 2) {
    return {
      error: "Enter an organization name with at least 2 characters.",
      success: null,
    };
  }
  if (!INSTITUTION_TYPES.has(institutionType)) {
    return {
      error: "Choose school, academy, or both.",
      success: null,
    };
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey,
    )
  ) {
    return {
      error: "Missing provisioning key. Reload the page and try again.",
      success: null,
    };
  }
  if (!isValidOrganizationSlug(slug)) {
    return {
      error:
        "Slug must be lowercase letters, numbers, and hyphens (e.g. green-valley).",
      success: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/sign-in?next=/app/onboarding");
  }

  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  // Never accept a client-supplied organization_id — the RPC binds ownership
  // to auth.uid() and ignores any attempt to attach to another tenant.
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    p_name: name,
    p_institution_type: institutionType,
    p_idempotency_key: idempotencyKey,
    p_slug: slug,
    p_timezone: "Asia/Karachi",
    p_locale: "en",
    p_campus_name: campusName,
  });

  if (error) {
    const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
    if (
      error.code === "23505" ||
      message.includes("organizations_slug_unique") ||
      message.includes("duplicate key")
    ) {
      return {
        error: "That slug is already taken. Choose a different one.",
        success: null,
      };
    }
    if (message.includes("Invalid organization slug")) {
      return {
        error:
          "Slug must be lowercase letters, numbers, and hyphens (e.g. green-valley).",
        success: null,
      };
    }
    return {
      error: "Could not create the organization. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as ProvisionRow | null;
  if (!row?.organization_id) {
    return {
      error: "Could not create the organization. Please try again.",
      success: null,
    };
  }

  const { writeContextCookies } =
    await import("@/features/platform/context/cookies");
  await writeContextCookies({
    organizationId: row.organization_id,
    campusId: row.campus_id ?? null,
  });

  redirect(
    `/app?organization=${row.organization_id}${
      row.campus_id ? `&campus=${row.campus_id}` : ""
    }`,
  );
}
