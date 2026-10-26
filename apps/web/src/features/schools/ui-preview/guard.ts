import "server-only";

import { notFound } from "next/navigation";

/**
 * UI preview is for local/preview design review only.
 * Block on Vercel Production and NODE_ENV=production.
 */
export function assertUiPreviewAllowed(): void {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") {
    notFound();
  }
  if (!vercelEnv && process.env.NODE_ENV === "production") {
    notFound();
  }
}
