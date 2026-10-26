import "server-only";

import { redirect } from "next/navigation";

import { isAuthorizationError } from "@/features/platform/authorization";
import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import type { PlatformPermission } from "@/features/platform/operator/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Loads session + platform authorization for /platform pages.
 * Unauthenticated → sign-in; authenticated non-operators → unauthorized.
 */
export async function requirePlatformOperatorPage(
  permission: PlatformPermission = "platform.organizations.read",
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/platform");
  }

  try {
    await authorizePlatform(permission, supabase, { userId: user.id });
  } catch (authError) {
    if (isAuthorizationError(authError)) {
      if (authError.code === "unauthenticated") {
        redirect("/auth/sign-in?next=/platform");
      }
      redirect("/platform/unauthorized");
    }
    throw authError;
  }

  return { supabase, user };
}
