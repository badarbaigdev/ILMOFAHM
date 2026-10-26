/**
 * Host → product surface resolution (ADR-0002).
 * When ROOT_DOMAIN is unset, the app stays path-based (/school, /platform).
 */

export const TENANCY_SURFACE_HEADER = "x-ilmofahm-surface";
export const TENANCY_SCHOOL_SLUG_HEADER = "x-ilmofahm-school-slug";

/** Subdomain labels that must never resolve as a school slug. */
export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "auth",
  "app",
  "cdn",
  "static",
  "assets",
  "mail",
  "smtp",
  "ftp",
  "ns1",
  "ns2",
  "status",
  "docs",
  "help",
  "support",
  "blog",
  "staging",
  "stage",
  "develop",
  "development",
  "preview",
  "platform",
  "school",
  "schools",
  "operator",
  "operators",
  "marketing",
]);

export type HostSurface =
  | { kind: "path" }
  | { kind: "marketing"; hostname: string }
  | { kind: "www"; canonicalHost: string }
  | { kind: "admin"; hostname: string }
  | { kind: "school"; hostname: string; slug: string }
  | { kind: "unknown"; hostname: string };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Strip port from a Host header value.
 */
export function hostnameFromHostHeader(hostHeader: string): string {
  const raw = hostHeader.trim().toLowerCase();
  if (!raw) return "";
  // IPv6 [::1]:port — uncommon in our deploy; keep simple split for host:port
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    return end >= 0 ? raw.slice(0, end + 1) : raw;
  }
  return raw.split(":")[0] ?? raw;
}

export function isValidSchoolSlug(value: string): boolean {
  return SLUG_RE.test(value) && !RESERVED_SUBDOMAINS.has(value);
}

/**
 * Resolve which product surface a request host maps to.
 * @param rootDomain e.g. "ilmofahm.com" or "localhost" — empty disables host routing
 */
export function resolveHostSurface(
  hostHeader: string,
  rootDomain: string | undefined | null,
): HostSurface {
  const hostname = hostnameFromHostHeader(hostHeader);
  const root = rootDomain?.trim().toLowerCase() ?? "";

  if (!root || !hostname) {
    return { kind: "path" };
  }

  if (hostname === root) {
    return { kind: "marketing", hostname };
  }

  if (hostname === `www.${root}`) {
    return { kind: "www", canonicalHost: root };
  }

  if (hostname === `admin.${root}`) {
    return { kind: "admin", hostname };
  }

  const suffix = `.${root}`;
  if (!hostname.endsWith(suffix)) {
    // Preview hosts (*.vercel.app) etc. — fall back to path mode
    return { kind: "path" };
  }

  const sub = hostname.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) {
    // apex already handled; multi-level like a.b.root → unknown for now
    return { kind: "unknown", hostname };
  }

  if (RESERVED_SUBDOMAINS.has(sub)) {
    return { kind: "unknown", hostname };
  }

  if (!isValidSchoolSlug(sub)) {
    return { kind: "unknown", hostname };
  }

  return { kind: "school", hostname, slug: sub };
}

/**
 * Map a public path on the admin host to an internal /platform path.
 */
export function mapAdminPathname(pathname: string): string {
  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return pathname;
  }
  if (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next")
  ) {
    return pathname;
  }
  if (pathname === "/") {
    return "/platform";
  }
  return `/platform${pathname}`;
}

/**
 * Map a public path on a school host to an internal /school path.
 */
export function mapSchoolPathname(pathname: string): string {
  if (pathname === "/school" || pathname.startsWith("/school/")) {
    return pathname;
  }
  if (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/ui-preview")
  ) {
    return pathname;
  }
  if (pathname === "/") {
    return "/school";
  }
  return `/school${pathname}`;
}

/**
 * Build absolute origin for a surface (no trailing slash).
 */
export function surfaceOrigin(
  protocol: "http" | "https",
  rootDomain: string,
  surface: "marketing" | "admin" | "school",
  schoolSlug?: string,
): string {
  const root = rootDomain.trim().toLowerCase();
  if (surface === "marketing") {
    return `${protocol}://${root}`;
  }
  if (surface === "admin") {
    return `${protocol}://${`admin.${root}`}`;
  }
  if (!schoolSlug || !isValidSchoolSlug(schoolSlug)) {
    throw new Error("schoolSlug is required for school surface origin");
  }
  return `${protocol}://${schoolSlug}.${root}`;
}
