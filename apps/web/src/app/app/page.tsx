import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Protected workspace placeholder. Identity is re-checked with getUser().
 * Organization onboarding arrives in ILM-PLAT-005.
 */
export default async function AppHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <h1 className="font-display text-4xl tracking-tight text-ink">
        Workspace
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        You are signed in
        {profile?.full_name ? ` as ${profile.full_name}` : ""}. Organization
        setup and role-scoped modules are not available yet.
      </p>
      <dl className="mt-8 space-y-2 text-sm text-ink-soft">
        <div>
          <dt className="inline font-medium text-ink">Email: </dt>
          <dd className="inline">{user.email ?? "unknown"}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-ink">User id: </dt>
          <dd className="inline font-mono text-xs">{user.id}</dd>
        </div>
      </dl>

      <form action={signOutAction} className="mt-10">
        <button
          type="submit"
          className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
