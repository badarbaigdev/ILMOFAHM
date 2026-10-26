import "server-only";

import { timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";

/**
 * Web bootstrap is only available when PLATFORM_BOOTSTRAP_SECRET is set
 * and the submitted key matches. Unset secret ⇒ browser bootstrap disabled
 * (use the local DB script instead).
 */
export function isWebBootstrapConfigured(): boolean {
  return Boolean(getServerEnv().platformBootstrapSecret);
}

export function bootstrapSecretsMatch(candidate: string | null | undefined): boolean {
  const expected = getServerEnv().platformBootstrapSecret;
  if (!expected) {
    return false;
  }
  const provided = (candidate ?? "").trim();
  if (!provided) {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
