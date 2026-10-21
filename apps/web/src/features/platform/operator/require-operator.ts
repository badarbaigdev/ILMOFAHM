import "server-only";

import { redirect } from "next/navigation";

import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import {
  isAuthorizationError,
} from "@/features/platform/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlatformPermission } from "@/features/platform/operator/permissions";

/**
 * Loads session + platform authorization for /platform pages.
 * Redirects org-only users to /app; unauthenticated users to sign-in.
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
      redirect("/app");
    }
    throw authError;
  }

  return { supabase, user };
}
