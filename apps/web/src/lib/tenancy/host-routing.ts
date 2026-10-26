import { NextResponse, type NextRequest } from "next/server";

import {
  TENANCY_SCHOOL_SLUG_HEADER,
  TENANCY_SURFACE_HEADER,
  mapAdminPathname,
  mapSchoolPathname,
  resolveHostSurface,
  type HostSurface,
} from "@/lib/tenancy/host";

export type HostRoutingPlan =
  | { action: "passthrough"; surface: Extract<HostSurface, { kind: "path" }> }
  | { action: "respond"; response: NextResponse }
  | {
      action: "continue";
      surface: Exclude<HostSurface, { kind: "path" | "www" | "unknown" }>;
      /** Internal pathname after host mapping (may equal original). */
      pathname: string;
      schoolSlug: string | null;
    };

function requestProtocol(request: NextRequest): "http" | "https" {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded === "http" || forwarded === "https") {
    return forwarded;
  }
  return request.nextUrl.protocol === "http:" ? "http" : "https";
}

/**
 * Decide host-based routing without performing session work.
 */
export function planHostRouting(
  request: NextRequest,
  rootDomain: string | undefined,
): HostRoutingPlan {
  const surface = resolveHostSurface(
    request.headers.get("host") ?? "",
    rootDomain,
  );

  if (surface.kind === "path") {
    return { action: "passthrough", surface };
  }

  if (surface.kind === "www") {
    const url = request.nextUrl.clone();
    url.hostname = surface.canonicalHost;
    url.protocol = `${requestProtocol(request)}:`;
    return {
      action: "respond",
      response: NextResponse.redirect(url, 308),
    };
  }

  if (surface.kind === "unknown") {
    return {
      action: "respond",
      response: new NextResponse("Not found", { status: 404 }),
    };
  }

  if (surface.kind === "marketing") {
    const pathname = request.nextUrl.pathname;
    const root = rootDomain!.trim().toLowerCase();
    if (pathname === "/platform" || pathname.startsWith("/platform/")) {
      const url = request.nextUrl.clone();
      url.hostname = `admin.${root}`;
      url.protocol = `${requestProtocol(request)}:`;
      return {
        action: "respond",
        response: NextResponse.redirect(url, 308),
      };
    }
    if (pathname === "/school" || pathname.startsWith("/school/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return {
        action: "respond",
        response: NextResponse.redirect(url, 308),
      };
    }
    return {
      action: "continue",
      surface,
      pathname,
      schoolSlug: null,
    };
  }

  if (surface.kind === "admin") {
    return {
      action: "continue",
      surface,
      pathname: mapAdminPathname(request.nextUrl.pathname),
      schoolSlug: null,
    };
  }

  return {
    action: "continue",
    surface,
    pathname: mapSchoolPathname(request.nextUrl.pathname),
    schoolSlug: surface.slug,
  };
}

/**
 * Build the middleware response for a continue plan (rewrite when needed).
 */
export function buildHostContinueResponse(
  request: NextRequest,
  plan: Extract<HostRoutingPlan, { action: "continue" }>,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANCY_SURFACE_HEADER, plan.surface.kind);
  if (plan.schoolSlug) {
    requestHeaders.set(TENANCY_SCHOOL_SLUG_HEADER, plan.schoolSlug);
  }

  if (plan.pathname !== request.nextUrl.pathname) {
    const url = request.nextUrl.clone();
    url.pathname = plan.pathname;
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
