"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { buildSchoolInviteAcceptUrl } from "@/features/auth/paths";
import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { isSchoolInviteRole } from "@/features/schools/permissions";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolMembershipActionState = {
  error: string | null;
  success: string | null;
  inviteUrl?: string | null;
};

const MEMBERSHIP_STATUSES = new Set(["active", "suspended", "revoked"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateMembers(schoolId: string) {
  revalidatePath("/school/members");
  revalidatePath(`/school/members?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/members?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolInvitationAction(
  _prev: SchoolMembershipActionState,
  formData: FormData,
): Promise<SchoolMembershipActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

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

  const { supabase, user } = await requireUser(schoolId);
  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  try {
    await authorizeSchool(supabase, user.id, schoolId, "membership.invite");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("create_school_invitation", {
    p_school_id: schoolId,
    p_email: email,
    p_role: role,
    p_expires_in_hours: 168,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to invite people to this school.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("school_invitations_pending_email_unique")
    ) {
      return {
        error: "A pending invitation already exists for that email.",
        success: null,
      };
    }
    return {
      error: "Could not create the invitation. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    token?: string;
  } | null;

  if (!row?.token) {
    return {
      error: "Could not create the invitation. Please try again.",
      success: null,
    };
  }

  const { appUrl } = getServerEnv();
  const inviteUrl = buildSchoolInviteAcceptUrl(appUrl, row.token);

  revalidateMembers(schoolId);
  return {
    error: null,
    success:
      "Invitation created. Share the link with the invitee (shown once). Email delivery is not wired yet.",
    inviteUrl,
  };
}

export async function revokeSchoolInvitationAction(
  _prev: SchoolMembershipActionState,
  formData: FormData,
): Promise<SchoolMembershipActionState> {
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();

  if (!isUuid(invitationId) || !isUuid(schoolId)) {
    return { error: "Invitation is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "membership.invite");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("revoke_school_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { error: "Could not revoke the invitation.", success: null };
  }

  revalidateMembers(schoolId);
  return { error: null, success: "Invitation revoked." };
}

export async function setSchoolMembershipStatusAction(
  _prev: SchoolMembershipActionState,
  formData: FormData,
): Promise<SchoolMembershipActionState> {
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!isUuid(membershipId) || !isUuid(schoolId)) {
    return { error: "Membership is required.", success: null };
  }
  if (!MEMBERSHIP_STATUSES.has(status)) {
    return { error: "Choose a valid status.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "membership.manage_status",
    );
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("set_school_membership_status", {
    p_membership_id: membershipId,
    p_status: status,
  });

  if (error) {
    if (error.message?.includes("own membership")) {
      return {
        error: "You cannot suspend or revoke your own membership.",
        success: null,
      };
    }
    if (error.message?.includes("last active owner")) {
      return {
        error: "Cannot suspend or revoke the last active owner.",
        success: null,
      };
    }
    return { error: "Could not update membership status.", success: null };
  }

  revalidateMembers(schoolId);
  return { error: null, success: "Membership status updated." };
}

export async function setSchoolMembershipRoleAction(
  _prev: SchoolMembershipActionState,
  formData: FormData,
): Promise<SchoolMembershipActionState> {
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!isUuid(membershipId) || !isUuid(schoolId)) {
    return { error: "Membership is required.", success: null };
  }
  if (!isSchoolInviteRole(role)) {
    return {
      error: "Choose admin, teacher, accountant, or staff.",
      success: null,
    };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "membership.manage_role",
    );
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("set_school_membership_role", {
    p_membership_id: membershipId,
    p_role: role,
  });

  if (error) {
    if (error.message?.includes("owner role")) {
      return {
        error: "The owner role cannot be changed here.",
        success: null,
      };
    }
    if (error.message?.includes("own role")) {
      return { error: "You cannot change your own role.", success: null };
    }
    return { error: "Could not update membership role.", success: null };
  }

  revalidateMembers(schoolId);
  return { error: null, success: "Membership role updated." };
}
