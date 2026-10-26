"use server";

import { randomBytes } from "node:crypto";

import { redirect } from "next/navigation";

import { peekSchoolInvitation } from "@/features/schools/invitations/peek";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ActivateSchoolInviteState = {
  error: string | null;
};

function generateTempPassword(): string {
  return `Tmp.${randomBytes(24).toString("base64url")}!9`;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createServiceSupabaseClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) return null;
    const users = listed.data.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (users.length < 200) return null;
    page += 1;
    if (page > 20) return null;
  }
}

/**
 * One-click school entry from the platform approval/activation link.
 * Creates the Auth user if needed (email locked to the invitation), attaches
 * membership, signs them in, then sends them to school setup/dashboard.
 * Password can be set afterwards via /auth/update-password.
 */
export async function activateSchoolInviteAction(
  _prev: ActivateSchoolInviteState,
  formData: FormData,
): Promise<ActivateSchoolInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  if (token.length < 32) {
    return { error: "Invitation token is missing or invalid." };
  }

  const peeked = await peekSchoolInvitation(token);
  if (!peeked) {
    return { error: "This invitation link is invalid." };
  }
  if (peeked.status !== "pending" && peeked.status !== "accepted") {
    return {
      error: `This invitation is ${peeked.status}. Ask the platform team for a new link.`,
    };
  }

  const email = peeked.email.toLowerCase();

  let admin;
  try {
    admin = createServiceSupabaseClient();
  } catch {
    return {
      error:
        "Server is missing SUPABASE_SECRET_KEY. Add it to apps/web/.env.local to enable one-click school activation.",
    };
  }

  let userId = await findUserIdByEmail(admin, email);
  let mustSetPassword = false;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: {
        must_set_password: true,
        full_name: email.split("@")[0] ?? undefined,
      },
    });

    if (created.error || !created.data.user) {
      const raced = await findUserIdByEmail(admin, email);
      if (!raced) {
        return {
          error:
            created.error?.message ||
            "Could not create the school admin account for this invitation.",
        };
      }
      userId = raced;
    } else {
      userId = created.data.user.id;
      mustSetPassword = true;
    }

    await admin.from("profiles").upsert(
      { id: userId, full_name: email.split("@")[0] ?? null },
      { onConflict: "id" },
    );
  } else {
    const { data: existing } = await admin.auth.admin.getUserById(userId);
    mustSetPassword = Boolean(
      existing.user?.user_metadata?.must_set_password,
    );
  }

  const { data: activated, error: activateError } = await admin.rpc(
    "activate_school_invitation",
    {
      p_token: token,
      p_user_id: userId,
    },
  );

  if (activateError) {
    const msg = activateError.message ?? "";
    if (msg.includes("already been used")) {
      return {
        error:
          "This invitation was already used by a different account. Ask the platform team to reissue the link.",
      };
    }
    if (msg.includes("expired")) {
      return { error: "This invitation has expired." };
    }
    if (msg.includes("revoked")) {
      return { error: "This invitation has been revoked." };
    }
    return {
      error: msg || "Could not activate the school invitation.",
    };
  }

  const row = (Array.isArray(activated) ? activated[0] : activated) as {
    out_school_id?: string;
  } | null;
  const schoolId = row?.out_school_id;
  if (!schoolId) {
    return { error: "Could not open the school after activation." };
  }

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (link.error || !link.data.properties?.hashed_token) {
    return {
      error:
        link.error?.message ||
        "School was activated but sign-in failed. Try signing in with this email.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });

  if (otpError) {
    return {
      error:
        otpError.message ||
        "School was activated but sign-in failed. Try the link again or sign in.",
    };
  }

  if (mustSetPassword) {
    await supabase.auth.updateUser({
      data: { must_set_password: true },
    });
  }

  const next =
    `/school/setup?school=${encodeURIComponent(schoolId)}` +
    (mustSetPassword ? "&setPassword=1" : "");
  redirect(next);
}
