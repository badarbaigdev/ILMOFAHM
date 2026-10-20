import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Ensures a public.profiles row exists for the Auth user.
 * Uses the session client so RLS (own-row insert/update) applies.
 * Does not overwrite an existing full_name with null.
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim() || null
      : null;

  const { data: existing, error: selectError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    return {
      ok: false,
      message: "Could not prepare your profile. Please try again.",
    };
  }

  if (existing) {
    return { ok: true };
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
  });

  if (error) {
    // Concurrent first login may race; treat unique violation as success.
    if (error.code === "23505") {
      return { ok: true };
    }
    return {
      ok: false,
      message: "Could not prepare your profile. Please try again.",
    };
  }

  return { ok: true };
}
