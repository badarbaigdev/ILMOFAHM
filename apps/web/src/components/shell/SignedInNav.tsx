"use client";

import { usePathname } from "next/navigation";

import { PlatformNav } from "@/components/shell/PlatformNav";
import { SchoolNav } from "@/components/shell/SchoolNav";

type SignedInNavProps = {
  /** Trusted server check — not a client-supplied claim. */
  isPlatformOperator: boolean;
};

/**
 * Chooses platform vs school nav from the current path.
 */
export function SignedInNav({ isPlatformOperator }: SignedInNavProps) {
  const pathname = usePathname() ?? "/school";
  const onPlatform = pathname.startsWith("/platform");

  if (onPlatform && isPlatformOperator) {
    return <PlatformNav />;
  }

  if (onPlatform && !isPlatformOperator) {
    return null;
  }

  return <SchoolNav />;
}
