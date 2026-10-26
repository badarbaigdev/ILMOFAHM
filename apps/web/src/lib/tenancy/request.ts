import "server-only";

import { headers } from "next/headers";

import {
  TENANCY_SCHOOL_SLUG_HEADER,
  TENANCY_SURFACE_HEADER,
} from "@/lib/tenancy/host";

export type TenancySurfaceName =
  | "path"
  | "marketing"
  | "admin"
  | "school"
  | null;

/**
 * Surface set by middleware when NEXT_PUBLIC_ROOT_DOMAIN host routing is on.
 */
export async function getRequestTenancySurface(): Promise<TenancySurfaceName> {
  const value = (await headers()).get(TENANCY_SURFACE_HEADER);
  if (
    value === "marketing" ||
    value === "admin" ||
    value === "school" ||
    value === "path"
  ) {
    return value;
  }
  return null;
}

/**
 * School slug from `{slug}.root` host (ADR-0002). Null in path mode.
 */
export async function getRequestSchoolSlug(): Promise<string | null> {
  const slug = (await headers()).get(TENANCY_SCHOOL_SLUG_HEADER)?.trim() ?? "";
  return slug.length > 0 ? slug : null;
}
