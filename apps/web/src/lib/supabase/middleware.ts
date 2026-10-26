import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeAuthNextPath } from "@/features/auth/paths";
import { EnvValidationError, getPublicEnv } from "@/lib/env";

type SessionMiddlewareOptions = {
  /** Effective pathname after host rewrites (ADR-0002). */
  pathname?: string;
  /** Preserve rewrite/next response when refreshing auth cookies. */
  createBaseResponse?: () => NextResponse;
};

/**
 * Refreshes the Auth session cookies and guards `/platform` and `/school`.
 * Legacy `/app/*`, `/platform/organizations*`, and `/auth/accept-invite`
 * redirect to the school/platform lanes. Uses getUser() so expired/missing
 * sessions fail closed. Platform console (except bootstrap/unauthorized)
 * requires an active platform_operators row — signup alone never grants it.
 */
export async function updateSession(
  request: NextRequest,
  options: SessionMiddlewareOptions = {},
) {
  const recreateBase =
    options.createBaseResponse ??
    (() =>
      NextResponse.next({
        request,
      }));
  let supabaseResponse = recreateBase();

  const pathname = options.pathname ?? request.nextUrl.pathname;

  // Legacy org workspace removed from the live product surface.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/school";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }
  if (
    pathname === "/platform/organizations" ||
    pathname.startsWith("/platform/organizations/")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/platform/schools";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }
  if (pathname === "/auth/accept-invite") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/accept-school-invite";
    // Preserve token query if present.
    return NextResponse.redirect(redirectUrl);
  }

  const isSchoolRoute =
    pathname === "/school" || pathname.startsWith("/school/");
  const isPlatformRoute =
    pathname === "/platform" || pathname.startsWith("/platform/");
  const isPlatformBootstrap = pathname === "/platform/bootstrap";
  const isPlatformUnauthorized = pathname === "/platform/unauthorized";
  const isProtectedRoute = isPlatformRoute || isSchoolRoute;

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
        supabaseResponse = recreateBase();
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
    const nextTarget = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/auth/sign-in" || pathname === "/auth/sign-up")) {
    const { data: operator } = await supabase
      .from("platform_operators")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    // Non-operators go to the school portal, not the legacy /app org workspace.
    const fallback = operator ? "/platform" : "/school";
    const requestedNext = request.nextUrl.searchParams.get("next");
    const next = safeAuthNextPath(requestedNext, fallback);

    const redirectUrl = request.nextUrl.clone();
    // Support next values that include a query string (invite tokens).
    if (next.includes("?")) {
      const [path, query = ""] = next.split("?");
      redirectUrl.pathname = path;
      redirectUrl.search = query ? `?${query}` : "";
    } else {
      redirectUrl.pathname = next;
      redirectUrl.search = "";
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    isPlatformRoute &&
    !isPlatformBootstrap &&
    !isPlatformUnauthorized
  ) {
    const { data: operator } = await supabase
      .from("platform_operators")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!operator) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/platform/unauthorized";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
