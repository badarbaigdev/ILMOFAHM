"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { isAuthorizationError } from "@/features/platform/authorization";
import {
  canApproveApplication,
  isSchoolApplicationStatus,
  schoolApplicationTransitionAllowed,
} from "@/features/school-applications/transitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReviewSchoolApplicationState = {
  error: string | null;
  success: string | null;
};

export type ApproveSchoolApplicationState = {
  error: string | null;
  success: string | null;
  invitationToken: string | null;
  schoolId: string | null;
  alreadyProvisioned: boolean;
};

async function requireSignedInOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in?next=/platform/requests");
  }
  return { supabase, user };
}

function mapRpcError(message: string | undefined): string {
  const msg = message ?? "";
  if (msg.includes("Not authorized")) {
    return "You do not have platform operator access.";
  }
  if (msg.includes("not allowed")) {
    return "That status change is not allowed from the current state.";
  }
  if (msg.includes("Rejection reason")) {
    return "A rejection reason is required.";
  }
  if (msg.includes("Information request")) {
    return "An information request message is required.";
  }
  if (msg.includes("Application not found")) {
    return "Application not found.";
  }
  if (msg.includes("Use approve_school_application")) {
    return "Approvals must use the approve action.";
  }
  return msg || "Could not update the application.";
}

export async function reviewSchoolApplicationAction(
  _prev: ReviewSchoolApplicationState,
  formData: FormData,
): Promise<ReviewSchoolApplicationState> {
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const toStatusRaw = String(formData.get("to_status") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();
  const informationRequest = String(
    formData.get("information_request") ?? "",
  ).trim();
  const fromStatusRaw = String(formData.get("from_status") ?? "").trim();

  if (!applicationId) {
    return { error: "Application id is required.", success: null };
  }
  if (!isSchoolApplicationStatus(toStatusRaw) || toStatusRaw === "approved") {
    return {
      error: "Choose a valid review status (approvals use Approve).",
      success: null,
    };
  }
  if (
    isSchoolApplicationStatus(fromStatusRaw) &&
    !schoolApplicationTransitionAllowed(fromStatusRaw, toStatusRaw)
  ) {
    return {
      error: "That status change is not allowed from the current state.",
      success: null,
    };
  }
  if (toStatusRaw === "rejected" && !rejectionReason) {
    return { error: "A rejection reason is required.", success: null };
  }
  if (toStatusRaw === "information_requested" && !informationRequest) {
    return {
      error: "An information request message is required.",
      success: null,
    };
  }

  const { supabase, user } = await requireSignedInOperator();

  try {
    await authorizePlatform("platform.applications.manage", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("review_school_application", {
    p_application_id: applicationId,
    p_to_status: toStatusRaw,
    p_review_notes: reviewNotes || null,
    p_rejection_reason:
      toStatusRaw === "rejected" ? rejectionReason : null,
    p_information_request:
      toStatusRaw === "information_requested" ? informationRequest : null,
  });

  if (error) {
    return { error: mapRpcError(error.message), success: null };
  }

  revalidatePath("/platform");
  revalidatePath("/platform/requests");
  revalidatePath(`/platform/requests/${applicationId}`);

  return {
    error: null,
    success: `Application updated to ${toStatusRaw.replaceAll("_", " ")}.`,
  };
}

export async function approveSchoolApplicationAction(
  _prev: ApproveSchoolApplicationState,
  formData: FormData,
): Promise<ApproveSchoolApplicationState> {
  const applicationId = String(formData.get("application_id") ?? "").trim();
  const fromStatusRaw = String(formData.get("from_status") ?? "").trim();
  const reviewNotes = String(formData.get("review_notes") ?? "").trim();
  const campusName = String(formData.get("campus_name") ?? "").trim();
  const confirm = String(formData.get("confirm_approve") ?? "") === "yes";

  if (!applicationId) {
    return {
      error: "Application id is required.",
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
    };
  }
  if (!confirm) {
    return {
      error: "Confirm approval before provisioning the school.",
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
    };
  }
  if (
    isSchoolApplicationStatus(fromStatusRaw) &&
    !canApproveApplication(fromStatusRaw) &&
    fromStatusRaw !== "approved"
  ) {
    return {
      error: "This application cannot be approved from its current status.",
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
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
      };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("approve_school_application", {
    p_application_id: applicationId,
    p_review_notes: reviewNotes || null,
    p_campus_name: campusName || "Main campus",
  });

  if (error) {
    return {
      error: mapRpcError(error.message),
      success: null,
      invitationToken: null,
      schoolId: null,
      alreadyProvisioned: false,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const schoolId = (row?.school_id as string | undefined) ?? null;
  const invitationToken =
    (row?.invitation_token as string | null | undefined) ?? null;
  const alreadyProvisioned = Boolean(row?.already_provisioned);

  revalidatePath("/platform");
  revalidatePath("/platform/schools");
  revalidatePath("/platform/requests");
  revalidatePath(`/platform/requests/${applicationId}`);

  return {
    error: null,
    success: alreadyProvisioned
      ? "School was already provisioned for this application."
      : "Application approved. School, default campus, and owner invitation were created.",
    invitationToken,
    schoolId,
    alreadyProvisioned,
  };
}
