"use server";

import { revalidatePath } from "next/cache";

import type { AuthActionState } from "@/features/auth/actions";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

const GENERIC_SUCCESS =
  "If that email belongs to a school owner or admin, a recovery request was sent to the platform team for review. You will receive a reset link through an approved channel after verification.";

/**
 * School admins request password recovery via platform review (not self-service email).
 * Uses service role only to resolve Auth user + membership; response avoids enumeration.
 */
export async function requestSchoolAdminPasswordRecoveryAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const schoolHint = String(formData.get("school_hint") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }
  if (reason.length < 8) {
    return {
      error: "Describe why you need a reset (at least 8 characters).",
      success: null,
    };
  }
  if (reason.length > 500) {
    return { error: "Keep the reason under 500 characters.", success: null };
  }

  try {
    const admin = createServiceSupabaseClient();

    // Resolve Auth user by email (paginate — admin API has no email filter).
    let authUserId: string | null = null;
    for (let page = 1; page <= 10; page += 1) {
      const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listed.error) {
        return {
          error: "Could not submit recovery request. Try again shortly.",
          success: null,
        };
      }
      const match = (listed.data.users ?? []).find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (match) {
        authUserId = match.id;
        break;
      }
      if ((listed.data.users ?? []).length < 200) break;
    }

    if (!authUserId) {
      // Same outward message whether or not the account exists.
      return { error: null, success: GENERIC_SUCCESS };
    }

    const { data: memberships, error: membershipError } = await admin
      .from("school_memberships")
      .select("id, school_id, role, status, schools(id, name, slug)")
      .eq("user_id", authUserId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]);

    if (membershipError) {
      return {
        error: "Could not submit recovery request. Try again shortly.",
        success: null,
      };
    }

    const rows = memberships ?? [];
    if (rows.length === 0) {
      return { error: null, success: GENERIC_SUCCESS };
    }

    const hint = schoolHint.toLowerCase();
    let selected = rows[0];
    if (hint) {
      const matched = rows.find((row) => {
        const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
        const name = String(school?.name ?? "").toLowerCase();
        const slug = String(school?.slug ?? "").toLowerCase();
        const id = String(row.school_id);
        return name.includes(hint) || slug === hint || id === hint;
      });
      if (matched) selected = matched;
    }

    if (!selected) {
      return { error: null, success: GENERIC_SUCCESS };
    }

    const { error: rpcError } = await admin.rpc(
      "create_school_password_recovery_request",
      {
        p_school_id: selected.school_id,
        p_membership_id: selected.id,
        p_requester_user_id: authUserId,
        p_requester_email: email,
        p_requester_role: selected.role,
        p_reason: reason,
      },
    );

    if (rpcError) {
      return {
        error: rpcError.message || "Could not submit recovery request.",
        success: null,
      };
    }

    revalidatePath("/platform/password-recovery");
    revalidatePath(`/platform/schools/${selected.school_id}`);
    return { error: null, success: GENERIC_SUCCESS };
  } catch {
    return {
      error: "Could not submit recovery request. Try again shortly.",
      success: null,
    };
  }
}
