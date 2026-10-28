/** Auth destinations allowed as post-login `next` (path only, before `?`). */
const ALLOWED_AUTH_NEXT_PATHS = new Set([
  "/auth/update-password",
  "/auth/accept-school-invite",
]);

function pathOnly(candidate: string): string {
  const queryIndex = candidate.indexOf("?");
  return queryIndex === -1 ? candidate : candidate.slice(0, queryIndex);
}

/** Safe internal redirect targets after Auth flows. */
export function safeAuthNextPath(
  candidate: string | null | undefined,
  fallback = "/school",
): string {
  if (!candidate) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  const path = pathOnly(candidate);
  if (ALLOWED_AUTH_NEXT_PATHS.has(path)) {
    // Preserve query string for invite tokens, etc.
    return candidate;
  }
  if (path.startsWith("/auth/")) {
    return fallback;
  }
  // Legacy org workspace — product surface is /school now.
  if (path === "/app" || path.startsWith("/app/")) {
    return "/school";
  }
  // Legacy org-tenant platform routes.
  if (
    path === "/platform/organizations" ||
    path.startsWith("/platform/organizations/")
  ) {
    return "/platform/schools";
  }
  // Allow marketing home, platform console, school portal.
  if (
    !(
      candidate === "/" ||
      path.startsWith("/platform") ||
      path.startsWith("/school")
    )
  ) {
    return fallback;
  }
  return candidate;
}

/** Default home for an authenticated user after sign-in. */
export function defaultPostAuthPath(isPlatformOperator: boolean): string {
  return isPlatformOperator ? "/platform" : "/school";
}

export function buildAuthCallbackUrl(
  appUrl: string,
  nextPath = "/school",
): string {
  const url = new URL("/auth/callback", appUrl);
  url.searchParams.set("next", safeAuthNextPath(nextPath));
  return url.toString();
}

/**
 * App-owned Auth confirm URL for admin `generateLink` hashed tokens.
 * Prefer this over Supabase `action_link` — those redirect with URL hash
 * fragments that a server `/auth/callback` route cannot exchange.
 */
export function buildAuthConfirmUrl(
  appUrl: string,
  tokenHash: string,
  type: "recovery" | "magiclink" | "invite" | "email" | "signup",
  nextPath = "/school",
): string {
  const url = new URL("/auth/confirm", appUrl.replace(/\/$/, ""));
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", safeAuthNextPath(nextPath));
  return url.toString();
}

/** Build a shareable school invitation acceptance URL. */
export function buildSchoolInviteAcceptUrl(
  appUrl: string,
  token: string,
): string {
  const url = new URL("/auth/accept-school-invite", appUrl.replace(/\/$/, ""));
  url.searchParams.set("token", token);
  return url.toString();
}
