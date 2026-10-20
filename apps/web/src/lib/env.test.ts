import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  EnvValidationError,
  getPublicEnv,
  getServerEnv,
  requireSupabaseSecretKey,
} from "./env";

const managedKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
] as const;

const original = new Map<string, string | undefined>();

function snapshotEnv() {
  for (const key of managedKeys) {
    original.set(key, process.env[key]);
  }
}

function restoreEnv() {
  for (const key of managedKeys) {
    const value = original.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function clearManagedEnv() {
  for (const key of managedKeys) {
    delete process.env[key];
  }
}

snapshotEnv();

afterEach(() => {
  restoreEnv();
});

describe("getPublicEnv", () => {
  it("returns trimmed public values when all required vars are set", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = " http://127.0.0.1:54321 ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " sb_publishable_test ";
    process.env.NEXT_PUBLIC_APP_URL = " http://localhost:3000 ";

    assert.deepEqual(getPublicEnv(), {
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_test",
      appUrl: "http://localhost:3000",
    });
  });

  it("names missing variables without echoing secrets", () => {
    clearManagedEnv();
    process.env.SUPABASE_SECRET_KEY = "super-secret-value-do-not-leak";

    assert.throws(
      () => getPublicEnv(),
      (error: unknown) => {
        assert.ok(error instanceof EnvValidationError);
        assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
        assert.match(error.message, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
        assert.match(error.message, /NEXT_PUBLIC_APP_URL/);
        assert.doesNotMatch(error.message, /super-secret-value-do-not-leak/);
        assert.deepEqual(error.missing, [
          "NEXT_PUBLIC_SUPABASE_URL",
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_APP_URL",
        ]);
        return true;
      },
    );
  });

  it("treats blank strings as missing", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    assert.throws(
      () => getPublicEnv(),
      (error: unknown) => {
        assert.ok(error instanceof EnvValidationError);
        assert.deepEqual(error.missing, ["NEXT_PUBLIC_SUPABASE_URL"]);
        return true;
      },
    );
  });
});

describe("getServerEnv", () => {
  it("includes optional secret when present", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";

    assert.equal(getServerEnv().supabaseSecretKey, "sb_secret_test");
  });

  it("rejects a public-prefixed secret key name", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY = "leaked";

    assert.throws(
      () => getServerEnv(),
      (error: unknown) => {
        assert.ok(error instanceof EnvValidationError);
        assert.match(error.message, /NEXT_PUBLIC_ prefix/);
        assert.doesNotMatch(error.message, /\bleaked\b/);
        return true;
      },
    );
  });
});

describe("requireSupabaseSecretKey", () => {
  it("fails safely when the privileged key is absent", () => {
    clearManagedEnv();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    assert.throws(
      () => requireSupabaseSecretKey(),
      (error: unknown) => {
        assert.ok(error instanceof EnvValidationError);
        assert.match(error.message, /SUPABASE_SECRET_KEY/);
        return true;
      },
    );
  });
});
