"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MembershipActionState = {
  error: string | null;
  success: string | null;
  inviteUrl?: string | null;
};

const INVITE_ROLES = new Set([
  "admin",
  "staff",
  "teacher",
  "finance",
  "guardian",
]);

const MEMBERSHIP_STATUSES = new Set(["active", "suspended", "revoked"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in?next=/app");
  }
  return { supabase, user };
}

export async function createInvitationAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }
  if (!email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }
  if (!INVITE_ROLES.has(role)) {
    return { error: "Choose a valid role.", success: null };
  }

  const { supabase, user } = await requireUser();
  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  try {
    // Body organization_id is re-validated via active membership + permission.
    await authorize(
      { organizationId, permission: "membership.invite" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc("create_organization_invitation", {
    p_organization_id: organizationId,
    p_email: email,
    p_role: role,
    p_expires_in_hours: 168,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You are not allowed to invite people to this organization.",
        success: null,
      };
    }
    if (
      error.code === "23505" ||
      error.message?.includes("organization_invitations_pending_email_unique")
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
    invitation_id: string;
    token: string;
    expires_at: string;
  } | null;

  if (!row?.token) {
    return {
      error: "Could not create the invitation. Please try again.",
      success: null,
    };
  }

  const { appUrl } = getServerEnv();
  const inviteUrl = new URL("/auth/accept-invite", appUrl);
  inviteUrl.searchParams.set("token", row.token);

  revalidatePath("/app/members");
  return {
    error: null,
    success:
      "Invitation created. Share the link with the invitee (shown once). Email delivery is not wired yet — copy the link.",
    inviteUrl: inviteUrl.toString(),
  };
}

export async function revokeInvitationAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  const organizationId = String(formData.get("organization_id") ?? "").trim();

  if (!isUuid(invitationId)) {
    return { error: "Invitation is required.", success: null };
  }
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }

  const { supabase, user } = await requireUser();

  try {
    await authorize(
      { organizationId, permission: "membership.invite" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("revoke_organization_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return {
      error: "Could not revoke the invitation.",
      success: null,
    };
  }

  revalidatePath("/app/members");
  revalidatePath(`/app/members?organization=${organizationId}`);
  return { error: null, success: "Invitation revoked." };
}

export async function setMembershipStatusAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const membershipId = String(formData.get("membership_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const organizationId = String(formData.get("organization_id") ?? "").trim();

  if (!isUuid(membershipId)) {
    return { error: "Membership is required.", success: null };
  }
  if (!isUuid(organizationId)) {
    return { error: "Organization is required.", success: null };
  }
  if (!MEMBERSHIP_STATUSES.has(status)) {
    return { error: "Invalid status.", success: null };
  }

  const { supabase, user } = await requireUser();

  try {
    await authorize(
      { organizationId, permission: "membership.manage_status" },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("set_membership_status", {
    p_membership_id: membershipId,
    p_status: status,
  });

  if (error) {
    if (error.message?.includes("last active owner")) {
      return {
        error: "Cannot suspend or revoke the last active owner.",
        success: null,
      };
    }
    if (error.message?.includes("their own membership")) {
      return {
        error: "You cannot suspend or revoke your own membership.",
        success: null,
      };
    }
    return {
      error: "Could not update membership status.",
      success: null,
    };
  }

  revalidatePath("/app/members");
  revalidatePath(`/app/members?organization=${organizationId}`);
  return { error: null, success: `Membership marked ${status}.` };
}

export async function acceptInvitationAction(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 32) {
    return { error: "Invitation token is missing or invalid.", success: null };
  }

  const { supabase, user } = await requireUser();
  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  const { data, error } = await supabase.rpc("accept_organization_invitation", {
    p_token: token,
  });

  if (error) {
    if (error.message?.includes("does not match")) {
      return {
        error:
          "Sign in with the email address this invitation was sent to, then try again.",
        success: null,
      };
    }
    if (error.message?.includes("already been used")) {
      return { error: "This invitation has already been used.", success: null };
    }
    if (error.message?.includes("expired")) {
      return { error: "This invitation has expired.", success: null };
    }
    if (error.message?.includes("revoked")) {
      return { error: "This invitation has been revoked.", success: null };
    }
    return {
      error: "Could not accept the invitation. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    out_organization_id: string;
  } | null;

  if (!row?.out_organization_id) {
    return {
      error: "Could not accept the invitation. Please try again.",
      success: null,
    };
  }

  redirect(`/app?organization=${row.out_organization_id}`);
}
