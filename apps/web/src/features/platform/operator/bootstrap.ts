import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns true when the database reports that first-operator bootstrap
 * is still available (no active platform operators).
 */
export async function isPlatformBootstrapAvailable(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("platform_bootstrap_available");
  if (error) {
    return false;
  }
  return data === true;
}
