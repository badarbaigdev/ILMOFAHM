import Link from "next/link";
import { redirect } from "next/navigation";

import { BootstrapPlatformOperatorForm } from "@/features/platform/operator/bootstrap-form";
import { isPlatformBootstrapAvailable } from "@/features/platform/operator/bootstrap";
import { isActivePlatformOperator } from "@/features/platform/operator/authorize-platform";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * One-time first-operator bootstrap. Disabled in the database after any
 * active platform operator exists.
 */
export default async function PlatformBootstrapPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?next=/platform/bootstrap");
  }

  if (await isActivePlatformOperator(supabase, user.id)) {
    redirect("/platform");
  }

  const available = await isPlatformBootstrapAvailable(supabase);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Platform setup
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
        Bootstrap platform operator
      </h1>

      {available ? (
        <>
          <p className="mt-4 text-base leading-relaxed text-muted">
            No active platform operator exists yet. Confirm that this signed-in
            account should become the first operator. Public sign-up never
            grants this privilege automatically.
          </p>
          <BootstrapPlatformOperatorForm />
        </>
      ) : (
        <>
          <p className="mt-4 text-base leading-relaxed text-muted" role="status">
            Platform bootstrap is disabled because an active operator already
            exists. Ask an existing operator to grant access, or use a controlled
            recovery process outside this page.
          </p>
          <p className="mt-6 text-sm">
            <Link
              href="/platform/unauthorized"
              className="font-medium text-ink underline-offset-2 hover:underline"
            >
              Platform access help
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
