"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolAccountActionState = {
  error: string | null;
  success: string | null;
};

async function requireSignedIn() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent("/school/account")}`);
  }
  return { supabase, user };
}

export async function updateSchoolAccountProfileAction(
  _prev: SchoolAccountActionState,
  formData: FormData,
): Promise<SchoolAccountActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName || fullName.length > 120) {
    return {
      error: "Enter a display name (up to 120 characters).",
      success: null,
    };
  }

  const { supabase, user } = await requireSignedIn();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return {
      error: error.message || "Could not update your profile.",
      success: null,
    };
  }

  revalidatePath("/school");
  revalidatePath("/school/account");
  return { error: null, success: "Profile saved." };
}

export async function updateSchoolAccountPasswordAction(
  _prev: SchoolAccountActionState,
  formData: FormData,
): Promise<SchoolAccountActionState> {
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

  const { supabase } = await requireSignedIn();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: error.message || "Could not update password.",
      success: null,
    };
  }

  return { error: null, success: "Password updated." };
}
