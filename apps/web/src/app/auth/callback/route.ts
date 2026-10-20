import { NextResponse } from "next/server";

import { ensureProfileForUser } from "@/features/auth/ensure-profile";
import { safeAuthNextPath } from "@/features/auth/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=missing_auth_code`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=auth_callback_failed`,
    );
  }

  const profile = await ensureProfileForUser(supabase, data.user);
  if (!profile.ok) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=profile_bootstrap_failed`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
