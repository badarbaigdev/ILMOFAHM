import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { EnvValidationError, getPublicEnv } from "@/lib/env";

/**
 * Refreshes the Auth session cookies and guards `/app` and `/platform` routes.
 * Uses getUser() so expired/missing sessions fail closed on the server.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isPlatformRoute =
    pathname === "/platform" || pathname.startsWith("/platform/");
  const isProtectedRoute = isAppRoute || isPlatformRoute;

  let supabaseUrl: string;
  let supabasePublishableKey: string;
  try {
    ({ supabaseUrl, supabasePublishableKey } = getPublicEnv());
  } catch (error) {
    if (error instanceof EnvValidationError) {
      if (isProtectedRoute) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/auth/sign-in";
        redirectUrl.searchParams.set("next", pathname);
        redirectUrl.searchParams.set("error", "missing_env");
        return NextResponse.redirect(redirectUrl);
      }
      return supabaseResponse;
    }
    throw error;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/sign-in";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/auth/sign-in" || pathname === "/auth/sign-up")) {
    const { data: operator } = await supabase
      .from("platform_operators")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = operator ? "/platform" : "/app";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
