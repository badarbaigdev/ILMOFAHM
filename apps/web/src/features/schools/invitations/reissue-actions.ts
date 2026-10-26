"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAuthorizationError } from "@/features/platform/authorization";
import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReissueOwnerInviteState = {
  error: string | null;
  success: string | null;
  invitationToken: string | null;
  email: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function reissueSchoolOwnerInvitationAction(
  _prev: ReissueOwnerInviteState,
  formData: FormData,
): Promise<ReissueOwnerInviteState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return {
      error: "School is required.",
      success: null,
      invitationToken: null,
      email: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/platform/requests");
  }

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
        email: null,
      };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc(
    "reissue_school_owner_invitation",
    { p_school_id: schoolId },
  );

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to create school activation links.",
        success: null,
        invitationToken: null,
        email: null,
      };
    }
    return {
      error: error.message || "Could not generate activation link.",
      success: null,
      invitationToken: null,
      email: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    invitation_token?: string;
    email?: string;
  } | null;

  if (!row?.invitation_token) {
    return {
      error: "Activation link was not returned. Try again.",
      success: null,
      invitationToken: null,
      email: null,
    };
  }

  revalidatePath("/platform/requests");
  revalidatePath("/platform/schools");

  return {
    error: null,
    success: "Activation link ready. Copy and share it with the school admin.",
    invitationToken: row.invitation_token,
    email: row.email ?? null,
  };
}
