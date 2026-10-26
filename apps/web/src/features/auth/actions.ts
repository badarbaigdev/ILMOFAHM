"use server";

import { redirect } from "next/navigation";

import {
  buildAuthCallbackUrl,
  defaultPostAuthPath,
  safeAuthNextPath,
} from "@/features/auth/paths";
import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { isActivePlatformOperator } from "@/features/platform/operator/authorize-platform";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
  success: string | null;
};

function readEmailPassword(formData: FormData): {
  email: string;
  password: string;
} | null {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return null;
  }
  if (password.length < 8) {
    return null;
  }

  return { email, password };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = readEmailPassword(formData);
  if (!parsed) {
    return {
      error: "Enter a valid email and a password with at least 8 characters.",
      success: null,
    };
  }

  const requestedNext = String(formData.get("next") ?? "").trim();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error || !data.user) {
    return {
      error: "Sign-in failed. Check your email and password.",
      success: null,
    };
  }

  const profile = await ensureProfileForUser(supabase, data.user);
  if (!profile.ok) {
    return { error: profile.message, success: null };
  }

  const isOperator = await isActivePlatformOperator(supabase, data.user.id);
  const fallback = defaultPostAuthPath(isOperator);
  const next = requestedNext
    ? safeAuthNextPath(requestedNext, fallback)
    : fallback;

  // Default home: operators land on the platform console.
  if (
    isOperator &&
    (next === "/school" || next === "/school/" || !requestedNext)
  ) {
    redirect("/platform");
  }

  redirect(next);
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = readEmailPassword(formData);
  if (!parsed) {
    return {
      error: "Enter a valid email and a password with at least 8 characters.",
      success: null,
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const requestedNext = String(formData.get("next") ?? "").trim();
  // Default after plain signup: school portal (empty until invite) — never implies admin.
  const nextPath = safeAuthNextPath(requestedNext, "/school");
  const { appUrl } = getServerEnv();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(appUrl, nextPath),
      data: {
        full_name: fullName || undefined,
      },
    },
  });

  if (error) {
    const raw = error.message ?? "";
    const msg = raw.toLowerCase();
    if (
      msg.includes("confirmation") ||
      msg.includes("sending") ||
      msg.includes("smtp") ||
      msg.includes("error sending")
    ) {
      return {
        error:
          "Signup failed while sending the confirmation email. For develop, turn off Authentication → Providers → Email → Confirm email in the Supabase dashboard, then try again.",
        success: null,
      };
    }
    if (
      msg.includes("invalid") ||
      msg.includes("email address") ||
      msg.includes("not allowed") ||
      msg.includes("is invalid")
    ) {
      return {
        error:
          "That email address cannot be used for signup (reserved or invalid domain). Use a normal email — not example.com / .test addresses.",
        success: null,
      };
    }
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error: "An account with that email already exists. Sign in instead.",
        success: null,
      };
    }
    if (msg.includes("rate limit") || msg.includes("over_email")) {
      return {
        error: "Too many signup attempts. Wait a minute and try again.",
        success: null,
      };
    }
    return {
      error: raw
        ? `Could not create the account: ${raw}`
        : "Could not create the account. Try a different email.",
      success: null,
    };
  }

  if (data.session && data.user) {
    const profile = await ensureProfileForUser(supabase, data.user);
    if (!profile.ok) {
      return { error: profile.message, success: null };
    }
    redirect(nextPath);
  }

  return {
    error: null,
    success:
      "Account created. Sign in to continue. School access requires an invitation; platform admin is never granted by signup.",
  };
}

export async function signOutAction(): Promise<void> {
  const { clearContextCookies } =
    await import("@/features/platform/context/cookies");
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  await clearContextCookies();
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", success: null };
  }

  const { appUrl } = getServerEnv();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl(appUrl, "/auth/update-password"),
  });

  if (error) {
    return {
      error: "Could not start password reset. Try again shortly.",
      success: null,
    };
  }

  // Same message whether or not the email exists — avoid account enumeration.
  return {
    error: null,
    success:
      "If an account exists for that email, a reset link has been sent. Check Mailpit locally or your inbox.",
  };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      success: null,
    };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match.", success: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset session expired. Request a new password reset link.",
      success: null,
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
    data: { must_set_password: false },
  });
  if (error) {
    return {
      error:
        error.message ||
        "Could not update the password. Try again or request a reset link.",
      success: null,
    };
  }

  redirect("/school");
}
