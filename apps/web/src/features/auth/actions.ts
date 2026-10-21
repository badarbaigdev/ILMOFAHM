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

  // Default workspace home: operators land on the platform console.
  if (isOperator && (next === "/app" || next === "/app/" || !requestedNext)) {
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
  const { appUrl } = getServerEnv();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(appUrl, "/app"),
      data: {
        full_name: fullName || undefined,
      },
    },
  });

  if (error) {
    return {
      error: "Could not create the account. Try a different email.",
      success: null,
    };
  }

  if (data.session && data.user) {
    const profile = await ensureProfileForUser(supabase, data.user);
    if (!profile.ok) {
      return { error: profile.message, success: null };
    }
    redirect("/app");
  }

  return {
    error: null,
    success:
      "Account created. Check your email to confirm the address if confirmation is required, then sign in.",
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

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: "Could not update the password. Request a new reset link.",
      success: null,
    };
  }

  redirect("/app");
}
