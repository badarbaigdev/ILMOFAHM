"use server";

import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AcceptSchoolInviteState = {
  error: string | null;
  success: string | null;
};

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in");
  }
  return { supabase, user };
}

export async function acceptSchoolInvitationAction(
  _prev: AcceptSchoolInviteState,
  formData: FormData,
): Promise<AcceptSchoolInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 32) {
    return { error: "Invitation token is missing or invalid.", success: null };
  }

  const { supabase, user } = await requireUser();
  const profile = await ensureProfileForUser(supabase, user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  const { data, error } = await supabase.rpc("accept_school_invitation", {
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
    if (error.message?.includes("not available")) {
      return {
        error: "This school is not available for activation.",
        success: null,
      };
    }
    if (error.message?.includes("Invalid invitation")) {
      return { error: "This invitation link is invalid.", success: null };
    }
    return {
      error: "Could not accept the invitation. Please try again.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    out_school_id: string;
  } | null;

  if (!row?.out_school_id) {
    return {
      error: "Could not accept the invitation. Please try again.",
      success: null,
    };
  }

  // New owners land on setup; already-complete schools still open /school/setup
  // which redirects managers as needed.
  redirect(`/school/setup?school=${row.out_school_id}`);
}
