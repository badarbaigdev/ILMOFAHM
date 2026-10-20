import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv, requireSupabaseSecretKey } from "@/lib/env";

/**
 * Privileged server-only client. Bypasses RLS — use only for tightly
 * controlled administrative operations. Never import from Client Components.
 */
export function createServiceSupabaseClient() {
  const { supabaseUrl } = getServerEnv();
  const secretKey = requireSupabaseSecretKey();

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
