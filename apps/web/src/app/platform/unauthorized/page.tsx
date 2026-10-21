import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Shown when a signed-in user reaches /platform without an active
 * platform_operators row (including suspended/revoked operators).
 */
export default async function PlatformUnauthorizedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/platform");
  }

  const { data: operator } = await supabase
    .from("platform_operators")
    .select("user_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (operator?.status === "active") {
    redirect("/platform");
  }

  const revokedOrSuspended =
    operator?.status === "revoked" || operator?.status === "suspended";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Platform access
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
        Not authorized
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted">
        {revokedOrSuspended
          ? "Your platform operator access is suspended or revoked. Contact another active operator if you need it restored."
          : "This console is limited to active platform operators. Signing up or joining a school does not grant platform privileges."}
      </p>
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href="/app"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Go to school workspace
        </Link>
        <Link
          href="/"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Public site
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
