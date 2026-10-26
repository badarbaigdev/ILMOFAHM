"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { isAuthorizationError } from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProvisionSchoolActionState = {
  error: string | null;
  success: string | null;
  invitationToken: string | null;
  schoolId: string | null;
  alreadyProvisioned: boolean;
  healed: boolean;
};

async function requireSignedInOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in?next=/platform/schools");
  }
  return { supabase, user };
}

function mapRpcError(message: string | undefined): string {
  const msg = message ?? "";
  if (msg.includes("Not authorized")) {
    return "You do not have platform operator access.";
  }
  if (msg.includes("must be approved")) {
    return "Approve the application before provisioning.";
  }
  if (msg.includes("Application not found")) {
    return "Application not found.";
  }
  return msg || "Could not provision the school.";
}

/**
 * Idempotent provision / heal for an already-approved application.
 */
export async function provisionSchoolFromApplicationAction(
  _prev: ProvisionSchoolActionState,
  formData: FormData,
): Promise<ProvisionSchoolActionState> {
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const campusName = String(formData.get("campus_name") ?? "").trim();

  if (!applicationId) {
    return {
      error: "Application id is required.",
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
      healed: false,
    };
  }

  const { supabase, user } = await requireSignedInOperator();

  try {
    await authorizePlatform("platform.applications.manage", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return {
        error: error.message,
        success: null,
        invitationToken: null,
        schoolId: null,
        alreadyProvisioned: false,
        healed: false,
      };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc(
    "provision_school_from_application",
    {
      p_application_id: applicationId,
      p_campus_name: campusName || "Main campus",
    },
  );

  if (error) {
    return {
      error: mapRpcError(error.message),
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
      healed: false,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const schoolId = (row?.school_id as string | undefined) ?? null;
  const invitationToken =
    (row?.invitation_token as string | null | undefined) ?? null;
  const alreadyProvisioned = Boolean(row?.already_provisioned);
  const healed = Boolean(row?.healed);

  revalidatePath("/platform");
  revalidatePath("/platform/schools");
  revalidatePath("/platform/requests");
  revalidatePath(`/platform/requests/${applicationId}`);

  let success: string;
  if (healed) {
    success = "Provisioning repaired missing campus or invitation.";
  } else if (alreadyProvisioned) {
    success = "School was already fully provisioned.";
  } else {
    success =
      "School, default campus, and owner invitation created successfully.";
  }

  return {
    error: null,
    success,
    invitationToken,
    schoolId,
    alreadyProvisioned,
    healed,
  };
}
