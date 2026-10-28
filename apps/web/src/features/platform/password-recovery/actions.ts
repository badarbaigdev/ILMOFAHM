"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AuthorizationError } from "@/features/platform/authorization/errors";
import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { buildAuthConfirmUrl } from "@/features/auth/paths";
import { getServerEnv } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PasswordRecoveryActionState = {
  error: string | null;
  success: string | null;
  recoveryUrl?: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateRecovery(schoolId?: string | null) {
  revalidatePath("/platform/password-recovery");
  if (schoolId) {
    revalidatePath(`/platform/schools/${schoolId}`);
  }
}

async function requireOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/platform/password-recovery");
  }
  return { supabase, user };
}

export async function denyPasswordRecoveryRequestAction(
  _prev: PasswordRecoveryActionState,
  formData: FormData,
): Promise<PasswordRecoveryActionState> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const note = String(formData.get("review_note") ?? "").trim();

  if (!isUuid(requestId)) {
    return { error: "Request is required.", success: null };
  }

  const { supabase, user } = await requireOperator();
  try {
    await authorizePlatform("platform.schools.manage_members", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc(
    "review_school_password_recovery_request",
    {
      p_request_id: requestId,
      p_decision: "deny",
      p_review_note: note || null,
    },
  );
  if (error) {
    return {
      error: error.message || "Could not deny the request.",
      success: null,
    };
  }

  revalidateRecovery(schoolId || null);
  return { error: null, success: "Recovery request denied." };
}

/**
 * Approve (if still pending), issue Auth recovery link, mark fulfilled.
 */
export async function approveAndIssuePasswordRecoveryAction(
  _prev: PasswordRecoveryActionState,
  formData: FormData,
): Promise<PasswordRecoveryActionState> {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const note = String(formData.get("review_note") ?? "").trim();

  if (!isUuid(requestId) || !isUuid(schoolId)) {
    return { error: "Request is required.", success: null };
  }
  if (!isUuid(userId) || !email.includes("@")) {
    return { error: "Requester account is incomplete.", success: null };
  }

  const { supabase, user } = await requireOperator();
  try {
    await authorizePlatform("platform.schools.manage_members", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  // Load current status — approve pending first.
  const { data: requestRow } = await supabase
    .from("school_password_recovery_requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();

  if (!requestRow) {
    return { error: "Recovery request not found.", success: null };
  }

  if (requestRow.status === "pending") {
    const { error: reviewError } = await supabase.rpc(
      "review_school_password_recovery_request",
      {
        p_request_id: requestId,
        p_decision: "approve",
        p_review_note: note || "Identity verified; recovery link issued.",
      },
    );
    if (reviewError) {
      return {
        error: reviewError.message || "Could not approve the request.",
        success: null,
      };
    }
  } else if (
    requestRow.status !== "approved" &&
    requestRow.status !== "fulfilled"
  ) {
    return {
      error: "Only pending or approved requests can receive a recovery link.",
      success: null,
    };
  }

  const { appUrl } = getServerEnv();
  const admin = createServiceSupabaseClient();
  const link = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    return {
      error: link.error?.message || "Could not create a password reset link.",
      success: null,
    };
  }

  const recoveryUrl = buildAuthConfirmUrl(
    appUrl,
    tokenHash,
    "recovery",
    "/auth/update-password",
  );

  const { error: fulfillError } = await supabase.rpc(
    "mark_school_password_recovery_fulfilled",
    { p_request_id: requestId },
  );
  if (fulfillError) {
    return {
      error:
        fulfillError.message ||
        "Link was created but the request could not be marked fulfilled.",
      success: null,
      recoveryUrl,
    };
  }

  revalidateRecovery(schoolId);
  return {
    error: null,
    success: `Recovery link created for ${email}. Share it through an approved channel — it is shown once.`,
    recoveryUrl,
  };
}
