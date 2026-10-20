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
  if (
    candidate.startsWith("/auth/") &&
    !ALLOWED_AUTH_NEXT_PATHS.has(candidate)
  ) {
    return fallback;
  }
  return candidate;
}

export function buildAuthCallbackUrl(
  appUrl: string,
  nextPath = "/app",
): string {
  const url = new URL("/auth/callback", appUrl);
  url.searchParams.set("next", safeAuthNextPath(nextPath));
  return url.toString();
}
