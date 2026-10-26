import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import {
  buildHostContinueResponse,
  planHostRouting,
} from "@/lib/tenancy/host-routing";

export async function middleware(request: NextRequest) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || undefined;
  const plan = planHostRouting(request, rootDomain);

  if (plan.action === "respond") {
    return plan.response;
  }

  if (plan.action === "passthrough") {
    return updateSession(request);
  }

  return updateSession(request, {
    pathname: plan.pathname,
    createBaseResponse: () => buildHostContinueResponse(request, plan),
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     * Session refresh must run for App Router pages that use cookies.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
