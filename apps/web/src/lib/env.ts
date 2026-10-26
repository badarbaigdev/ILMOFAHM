/**
 * Typed environment access for ILMOFAHM.
 * Never log secret values. Fail with actionable messages in development.
 */

export class EnvValidationError extends Error {
  readonly missing: readonly string[];

  constructor(message: string, missing: readonly string[] = []) {
    super(message);
    this.name = "EnvValidationError";
    this.missing = missing;
  }
}

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appUrl: string;
  /**
   * Apex domain for host routing (ADR-0002), e.g. `ilmofahm.com` or `localhost`.
   * When unset, the app uses path-based `/school` and `/platform` URLs.
   */
  rootDomain: string | undefined;
};

export type ServerEnv = PublicEnv & {
  /** Present only when configured; privileged — server-only use. */
  supabaseSecretKey: string | undefined;
  /**
   * Required to use browser `/platform/bootstrap`. Never `NEXT_PUBLIC_*`.
   * Leave unset to disable web bootstrap (script-only).
   */
  platformBootstrapSecret: string | undefined;
};

function readRaw(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function missingMessage(names: readonly string[]): string {
  const list = names.join(", ");
  return (
    `Missing required environment variable(s): ${list}. ` +
    `Copy apps/web/.env.example to apps/web/.env.local and set local values ` +
    `(from \`supabase status\` or a non-production Supabase project). ` +
    `Never put SUPABASE_SECRET_KEY under a NEXT_PUBLIC_ name.`
  );
}

/**
 * Validates public (browser-safe) configuration.
 * Safe to call from Client Components for the public subset only.
 */
export function getPublicEnv(): PublicEnv {
  const supabaseUrl = readRaw("NEXT_PUBLIC_SUPABASE_URL");
  const supabasePublishableKey = readRaw(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  const appUrl = readRaw("NEXT_PUBLIC_APP_URL");
  const rootDomain = readRaw("NEXT_PUBLIC_ROOT_DOMAIN");

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabasePublishableKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");

  if (missing.length > 0) {
    throw new EnvValidationError(missingMessage(missing), missing);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabasePublishableKey: supabasePublishableKey!,
    appUrl: appUrl!,
    rootDomain,
  };
}

/**
 * Public env plus optional server-only secret.
 * Do not import this into Client Components.
 */
export function getServerEnv(): ServerEnv {
  const publicEnv = getPublicEnv();
  const supabaseSecretKey = readRaw("SUPABASE_SECRET_KEY");
  const platformBootstrapSecret = readRaw("PLATFORM_BOOTSTRAP_SECRET");

  if (readRaw("NEXT_PUBLIC_SUPABASE_SECRET_KEY")) {
    throw new EnvValidationError(
      "Invalid configuration: SUPABASE_SECRET_KEY must not use the NEXT_PUBLIC_ prefix. " +
        "Remove NEXT_PUBLIC_SUPABASE_SECRET_KEY and use SUPABASE_SECRET_KEY on the server only.",
      ["NEXT_PUBLIC_SUPABASE_SECRET_KEY"],
    );
  }

  if (readRaw("NEXT_PUBLIC_PLATFORM_BOOTSTRAP_SECRET")) {
    throw new EnvValidationError(
      "Invalid configuration: PLATFORM_BOOTSTRAP_SECRET must not use the NEXT_PUBLIC_ prefix.",
      ["NEXT_PUBLIC_PLATFORM_BOOTSTRAP_SECRET"],
    );
  }

  return {
    ...publicEnv,
    supabaseSecretKey,
    platformBootstrapSecret,
  };
}

/**
 * Requires the privileged key. Use only for tightly controlled server admin paths.
 */
export function requireSupabaseSecretKey(): string {
  const { supabaseSecretKey } = getServerEnv();
  if (!supabaseSecretKey) {
    throw new EnvValidationError(missingMessage(["SUPABASE_SECRET_KEY"]), [
      "SUPABASE_SECRET_KEY",
    ]);
  }
  return supabaseSecretKey;
}
