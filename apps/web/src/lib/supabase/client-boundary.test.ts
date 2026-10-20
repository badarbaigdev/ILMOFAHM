import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(
    join(process.cwd(), "src/lib/supabase", relativePath),
    "utf8",
  );
}

describe("supabase client boundaries", () => {
  it("keeps the browser helper free of the secret key", () => {
    const source = read("browser.ts");
    assert.doesNotMatch(source, /process\.env\.SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(source, /requireSupabaseSecretKey/);
    assert.doesNotMatch(source, /createServiceSupabaseClient/);
    assert.doesNotMatch(source, /server-only/);
    assert.match(source, /createBrowserClient/);
    assert.match(source, /getPublicEnv/);
  });

  it("marks SSR and admin helpers as server-only", () => {
    assert.match(read("server.ts"), /server-only/);
    assert.match(read("admin.ts"), /server-only/);
    assert.match(read("admin.ts"), /requireSupabaseSecretKey/);
    assert.doesNotMatch(read("server.ts"), /process\.env\.SUPABASE_SECRET_KEY/);
    assert.doesNotMatch(read("server.ts"), /requireSupabaseSecretKey/);
  });
});

