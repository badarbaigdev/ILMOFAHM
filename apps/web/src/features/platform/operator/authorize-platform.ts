import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthorizationError } from "@/features/platform/authorization/errors";
import {
  platformOperatorHasPermission,
  type PlatformPermission,
} from "@/features/platform/operator/permissions";

export type PlatformAuthContext = {
  userId: string;
  permission: PlatformPermission;
};

/**
 * Server-side gate for platform operator (Superadmin) actions.
 * Does not grant tenant membership — org data stays behind RLS/membership.
 */
export async function authorizePlatform(
  permission: PlatformPermission,
  supabase: SupabaseClient,
  options?: { userId?: string | null },
): Promise<PlatformAuthContext> {
  let userId = options?.userId ?? null;
  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthorizationError(
        "unauthenticated",
        "You must be signed in to continue.",
      );
    }
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("platform_operators")
    .select("user_id, status, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError(
      "missing_permission",
      "You do not have platform operator access.",
    );
  }

  if (!platformOperatorHasPermission(permission)) {
    throw new AuthorizationError(
      "missing_permission",
      "You do not have permission to perform this platform action.",
    );
  }

  return { userId, permission };
}

export async function canPlatform(
  permission: PlatformPermission,
  supabase: SupabaseClient,
  options?: { userId?: string | null },
): Promise<boolean> {
  try {
    await authorizePlatform(permission, supabase, options);
    return true;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return false;
    }
    throw error;
  }
}

/** Fast check used for post-login redirect and shell nav. */
export async function isActivePlatformOperator(
  supabase: SupabaseClient,
  userId?: string | null,
): Promise<boolean> {
  return canPlatform("platform.organizations.read", supabase, { userId });
}
