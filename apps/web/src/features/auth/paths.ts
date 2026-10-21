/** Allowed post-callback destinations under `/auth` (password recovery). */
const ALLOWED_AUTH_NEXT_PATHS = new Set(["/auth/update-password"]);

/** Safe internal redirect targets after Auth flows. */
export function safeAuthNextPath(
  candidate: string | null | undefined,
  fallback = "/app",
): string {
  if (!candidate) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  if (ALLOWED_AUTH_NEXT_PATHS.has(candidate)) {
    return candidate;
  }
  if (candidate.startsWith("/auth/")) {
    return fallback;
  }
  // Allow workspace and platform operator console paths only.
  if (!(
    candidate === "/" ||
    candidate.startsWith("/app") ||
    candidate.startsWith("/platform")
  )) {
    return fallback;
  }
  return candidate;
}

/** Default home for an authenticated user after sign-in. */
export function defaultPostAuthPath(isPlatformOperator: boolean): string {
  return isPlatformOperator ? "/platform" : "/app";
}

export function buildAuthCallbackUrl(
  appUrl: string,
  nextPath = "/app",
): string {
  const url = new URL("/auth/callback", appUrl);
  url.searchParams.set("next", safeAuthNextPath(nextPath));
  return url.toString();
}
