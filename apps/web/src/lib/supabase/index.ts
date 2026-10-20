/**
 * Local Supabase helpers. Prefer these over importing `@supabase/ssr`
 * or `@supabase/supabase-js` directly from feature code.
 *
 * - Browser: `createBrowserSupabaseClient` (publishable key)
 * - Server session: `createServerSupabaseClient` (cookies + publishable key)
 * - Privileged admin: `createServiceSupabaseClient` (secret key, server-only)
 */

export { createBrowserSupabaseClient } from "./browser";
export { createServerSupabaseClient } from "./server";
export { createServiceSupabaseClient } from "./admin";
