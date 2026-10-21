"use client";

import { usePathname } from "next/navigation";

import { PlatformNav } from "@/components/shell/PlatformNav";
import { WorkspaceNav } from "@/components/shell/WorkspaceNav";

type SignedInNavProps = {
  /** Trusted server check — not a client-supplied claim. */
  isPlatformOperator: boolean;
};

/**
 * Chooses platform vs organization nav from the current path.
 * Operators on /platform see the console; elsewhere they see workspace links
 * only if they also use /app (they typically will not have org membership).
 */
export function SignedInNav({ isPlatformOperator }: SignedInNavProps) {
  const pathname = usePathname() ?? "/app";
  const onPlatform = pathname.startsWith("/platform");

  if (onPlatform && isPlatformOperator) {
    return <PlatformNav />;
  }

  if (onPlatform && !isPlatformOperator) {
    // Guarded pages redirect; keep nav empty-safe.
    return null;
  }

  return <WorkspaceNav />;
}
