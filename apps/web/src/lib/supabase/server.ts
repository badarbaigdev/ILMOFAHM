import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";

/**
 * Cookie-based SSR Supabase client for Server Components, Route Handlers,
 * and Server Actions. Uses the publishable key + user session cookies.
 * Do not use the privileged secret key here.
 */
export async function createServerSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh in middleware (M1) will write cookies instead.
        }
      },
    },
  });
}
