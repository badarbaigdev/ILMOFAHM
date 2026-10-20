import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

/**
 * Browser Supabase client (publishable key only).
 * Safe for Client Components. Never reads the privileged secret key.
 */
export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
