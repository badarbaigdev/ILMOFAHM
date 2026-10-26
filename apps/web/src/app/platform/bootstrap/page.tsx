import Link from "next/link";
import { redirect } from "next/navigation";

import { BootstrapPlatformOperatorForm } from "@/features/platform/operator/bootstrap-form";
import { isPlatformBootstrapAvailable } from "@/features/platform/operator/bootstrap";
import {
  bootstrapSecretsMatch,
  isWebBootstrapConfigured,
} from "@/features/platform/operator/bootstrap-secret";
import { isActivePlatformOperator } from "@/features/platform/operator/authorize-platform";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ key?: string }>;
};

/**
 * First-operator bootstrap. Not a public signup path.
 * Requires PLATFORM_BOOTSTRAP_SECRET (env) + matching form/key, and zero
 * active operators in the database.
 */
export default async function PlatformBootstrapPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
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

  const webConfigured = isWebBootstrapConfigured();
  const available = await isPlatformBootstrapAvailable(supabase);
  const keyFromQuery = params.key?.trim() ?? "";
  const keyOk = keyFromQuery ? bootstrapSecretsMatch(keyFromQuery) : false;

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

      {!webConfigured ? (
        <>
          <p className="mt-4 text-base leading-relaxed text-muted" role="status">
            Browser bootstrap is disabled. Set a server-only{" "}
            <span className="font-mono text-ink">PLATFORM_BOOTSTRAP_SECRET</span>{" "}
            in <span className="font-mono text-ink">.env.local</span>, or run
            the local script from the repository root.
          </p>
          <p className="mt-4 font-mono text-sm text-muted">
            ./scripts/bootstrap-platform-operator.sh your@email.test
          </p>
        </>
      ) : !available ? (
        <>
          <p className="mt-4 text-base leading-relaxed text-muted" role="status">
            Platform bootstrap is permanently disabled because an active
            operator already exists. Ask an existing operator to grant access.
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
      ) : (
        <>
          <p className="mt-4 text-base leading-relaxed text-muted">
            No active platform operator exists yet. Enter the bootstrap secret
            from server configuration to promote this signed-in account. Public
            sign-up never grants this privilege.
          </p>
          {!keyOk && keyFromQuery ? (
            <p role="alert" className="mt-4 text-sm text-red-700">
              The key in the URL does not match the server secret.
            </p>
          ) : null}
          <BootstrapPlatformOperatorForm
            presetKey={keyOk ? keyFromQuery : ""}
          />
        </>
      )}
    </main>
  );
}
