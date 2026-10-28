import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { safeAuthNextPath } from "@/features/auth/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "recovery",
  "magiclink",
  "invite",
  "email",
  "signup",
  "email_change",
]);

/**
 * Completes Auth links that carry `token_hash` (from admin generateLink).
 * Supabase `action_link` verify redirects put tokens in the URL hash, which
 * never reaches this server — so recovery/reset links must use this route.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const requestedNext = searchParams.get("next");

  if (!tokenHash || !typeParam || !ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=invalid_confirm_link`,
    );
  }

  const type = typeParam as EmailOtpType;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=confirm_failed`,
    );
  }

  const profile = await ensureProfileForUser(supabase, data.user);
  if (!profile.ok) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=profile_bootstrap_failed`,
    );
  }

  const next =
    type === "recovery"
      ? safeAuthNextPath(requestedNext, "/auth/update-password")
      : safeAuthNextPath(requestedNext, "/school");

  return NextResponse.redirect(`${origin}${next}`);
}
