import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppHomePageProps = {
  searchParams: Promise<{ organization?: string; campus?: string }>;
};

/**
 * Protected workspace. Identity is re-checked with getUser().
 * Context selector preferences are cookies/query hints only — not authorization.
 */
export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const params = await searchParams;
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

  let context;
  try {
    context = await loadWorkspaceContext(supabase, user.id, {
      organizationId: params.organization,
      campusId: params.campus,
    });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Workspace
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load your workspace context. Please try again shortly.
        </p>
      </main>
    );
  }

  if (!context) {
    redirect("/app/onboarding");
  }

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
        {profile?.full_name ? ` as ${profile.full_name}` : ""}. Context below is
        a navigation preference — permissions are checked on the server for each
        action.
      </p>

      <section aria-labelledby="context-heading" className="mt-10">
        <h2
          id="context-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Active context
        </h2>
        <div className="mt-4">
          <ContextSelector
            organizations={context.organizations}
            campuses={context.allCampuses}
            organizationId={context.organization.id}
            campusId={context.campus?.id ?? null}
            returnTo="/app"
          />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {context.organization.name}
          </span>
          {context.campus ? ` · ${context.campus.name}` : " · No campus"}
          <span className="text-muted">
            {" "}
            · role {context.organization.role}
          </span>
        </p>
        {context.ignoredInvalidSelection ? (
          <p className="mt-2 text-sm text-muted">
            An invalid organization or campus selection was ignored.
          </p>
        ) : null}
      </section>

      <p className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <Link
          href={`/app/setup?organization=${context.organization.id}`}
          className="text-ink-soft underline"
        >
          Academic setup
        </Link>
        <Link
          href={`/app/settings?organization=${context.organization.id}`}
          className="text-ink-soft underline"
        >
          Organization settings
        </Link>
        <Link
          href={`/app/members?organization=${context.organization.id}`}
          className="text-ink-soft underline"
        >
          Manage members
        </Link>
        <Link
          href={`/app/audit?organization=${context.organization.id}`}
          className="text-ink-soft underline"
        >
          Audit log
        </Link>
        <Link href="/app/onboarding" className="text-ink-soft underline">
          Create organization
        </Link>
      </p>

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
