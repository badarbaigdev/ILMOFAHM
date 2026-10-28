"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildAuthConfirmUrl,
  buildSchoolInviteAcceptUrl,
} from "@/features/auth/paths";
import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { AuthorizationError } from "@/features/platform/authorization/errors";
import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { isSchoolInviteRole } from "@/features/schools/permissions";
import { getServerEnv } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PlatformSchoolAdminActionState = {
  error: string | null;
  success: string | null;
  inviteUrl?: string | null;
  recoveryUrl?: string | null;
};

const MEMBERSHIP_STATUSES = new Set(["active", "suspended", "revoked"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateSchoolAdmin(schoolId: string) {
  revalidatePath(`/platform/schools/${schoolId}`);
  revalidatePath("/platform/schools");
  revalidatePath("/school/members");
  revalidatePath(`/school/members?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/platform/schools");
  }
  return { supabase, user };
}

export async function platformInviteSchoolAdminAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "admin").trim();

  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }
  if (!email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }
  if (!isSchoolInviteRole(role)) {
    return {
      error: "Choose admin, teacher, accountant, or staff.",
      success: null,
    };
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

  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  const { data, error } = await supabase.rpc("create_school_invitation", {
    p_school_id: schoolId,
    p_email: email,
    p_role: role,
  });
  if (error) {
    return {
      error: error.message || "Could not create invitation.",
      success: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const token = row?.token ? String(row.token) : "";
  const { appUrl } = getServerEnv();
  const inviteUrl = token
    ? buildSchoolInviteAcceptUrl(appUrl, token)
    : null;

  revalidateSchoolAdmin(schoolId);
  return {
    error: null,
    success: `Invitation created for ${email}.`,
    inviteUrl,
  };
}

export async function platformSetMembershipStatusAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!isUuid(schoolId) || !isUuid(membershipId)) {
    return { error: "Membership is required.", success: null };
  }
  if (!MEMBERSHIP_STATUSES.has(status)) {
    return { error: "Choose a valid status.", success: null };
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

  const { error } = await supabase.rpc("set_school_membership_status", {
    p_membership_id: membershipId,
    p_status: status,
  });
  if (error) {
    return {
      error: error.message || "Could not update membership status.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  return {
    error: null,
    success: `Membership marked ${status}.`,
  };
}

export async function platformSetMembershipRoleAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!isUuid(schoolId) || !isUuid(membershipId)) {
    return { error: "Membership is required.", success: null };
  }
  if (!isSchoolInviteRole(role)) {
    return { error: "Choose a valid staff role.", success: null };
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

  const { error } = await supabase.rpc("set_school_membership_role", {
    p_membership_id: membershipId,
    p_role: role,
  });
  if (error) {
    return {
      error: error.message || "Could not update membership role.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  return { error: null, success: `Role updated to ${role}.` };
}

export async function platformRevokeInvitationAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(invitationId)) {
    return { error: "Invitation is required.", success: null };
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

  const { error } = await supabase.rpc("revoke_school_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) {
    return {
      error: error.message || "Could not revoke invitation.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  return { error: null, success: "Invitation revoked." };
}

export async function platformResetMemberProfileAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!isUuid(schoolId) || !isUuid(userId)) {
    return { error: "Member is required.", success: null };
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return {
      error: "Enter a display name between 2 and 120 characters.",
      success: null,
    };
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

  // Confirm the user is a member of this school before privileged profile write.
  const { data: membership, error: membershipError } = await supabase
    .from("school_memberships")
    .select("id")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError || !membership) {
    return {
      error: "That user is not a member of this school.",
      success: null,
    };
  }

  const admin = createServiceSupabaseClient();
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: fullName }, { onConflict: "id" });
  if (profileError) {
    return {
      error: profileError.message || "Could not update profile.",
      success: null,
    };
  }

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: fullName },
  });

  revalidateSchoolAdmin(schoolId);
  return { error: null, success: "Profile display name updated." };
}

export async function platformResetMemberPasswordAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!isUuid(schoolId) || !isUuid(userId)) {
    return { error: "Member is required.", success: null };
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

  const { data: membership } = await supabase
    .from("school_memberships")
    .select("id")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) {
    return {
      error: "That user is not a member of this school.",
      success: null,
    };
  }

  const admin = createServiceSupabaseClient();
  const { data: authUser, error: getError } =
    await admin.auth.admin.getUserById(userId);
  if (getError || !authUser.user?.email) {
    return {
      error: "Could not resolve the member Auth account.",
      success: null,
    };
  }

  const { appUrl } = getServerEnv();
  const link = await admin.auth.admin.generateLink({
    type: "recovery",
    email: authUser.user.email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    return {
      error: link.error?.message || "Could not create a password reset link.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  return {
    error: null,
    success: `Password reset link created for ${authUser.user.email}. Share it securely — it is shown once.`,
    recoveryUrl: buildAuthConfirmUrl(
      appUrl,
      tokenHash,
      "recovery",
      "/auth/update-password",
    ),
  };
}

export async function startSchoolSupportSessionAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const hoursRaw = String(formData.get("duration_hours") ?? "4").trim();
  const durationHours = Number(hoursRaw);

  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }
  if (reason.length < 8) {
    return {
      error: "Enter a support reason (at least 8 characters).",
      success: null,
    };
  }

  const { supabase, user } = await requireOperator();
  try {
    await authorizePlatform("platform.schools.support_access", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("start_school_support_session", {
    p_school_id: schoolId,
    p_reason: reason,
    p_duration_hours: Number.isFinite(durationHours) ? durationHours : 4,
  });
  if (error) {
    return {
      error: error.message || "Could not start support session.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  redirect(`/school?school=${encodeURIComponent(schoolId)}`);
}

export async function endSchoolSupportSessionAction(
  _prev: PlatformSchoolAdminActionState,
  formData: FormData,
): Promise<PlatformSchoolAdminActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const { supabase, user } = await requireOperator();
  try {
    await authorizePlatform("platform.schools.support_access", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("end_school_support_session", {
    p_session_id: null,
    p_school_id: schoolId,
  });
  if (error) {
    return {
      error: error.message || "Could not end support session.",
      success: null,
    };
  }

  revalidateSchoolAdmin(schoolId);
  revalidatePath("/school");
  redirect(`/platform/schools/${schoolId}`);
}
