/**
 * Lightweight in-process rate limit for public school registration.
 * Suitable for single-instance / preview abuse reduction — not a distributed limiter.
 */

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export function checkRateLimit(
  key: string,
  options?: { limit?: number; windowMs?: number; now?: number },
): RateLimitResult {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options?.now ?? Date.now();

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { allowed: true };
}

/** Test helper — clears all buckets. */
export function resetRateLimitBucketsForTests(): void {
  buckets.clear();
}

export function buildRegistrationRateLimitKey(parts: {
  ip: string | null;
  email: string;
}): string {
  const ip = (parts.ip ?? "unknown").slice(0, 64);
  const email = parts.email.trim().toLowerCase().slice(0, 254);
  return `school-application:${ip}:${email}`;
}
