import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { listActiveMemberships } from "@/features/platform/onboarding/memberships";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppHomePageProps = {
  searchParams: Promise<{ organization?: string }>;
};

/**
 * Protected workspace. Identity is re-checked with getUser().
 * Organization list comes from memberships (RLS), not client-supplied IDs.
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

  let memberships;
  try {
    memberships = await listActiveMemberships(supabase, user.id);
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
          Could not load your organizations. Please try again shortly.
        </p>
      </main>
    );
  }

  if (memberships.length === 0) {
    redirect("/app/onboarding");
  }

  // Optional ?organization= is display preference only — never authorization.
  const requestedOrgId = params.organization?.trim();
  const selected =
    memberships.find((m) => m.organizationId === requestedOrgId) ??
    memberships[0];

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
        {profile?.full_name ? ` as ${profile.full_name}` : ""}. Context
        switching and role-scoped modules arrive in later milestones.
      </p>

      <section aria-labelledby="orgs-heading" className="mt-10">
        <h2
          id="orgs-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Your organizations
        </h2>
        <ul className="mt-4 space-y-3">
          {memberships.map((membership) => {
            const isSelected =
              membership.organizationId === selected.organizationId;
            return (
              <li key={membership.organizationId}>
                <Link
                  href={`/app?organization=${membership.organizationId}`}
                  className={
                    isSelected
                      ? "block border-b border-teal pb-2 text-ink"
                      : "block border-b border-line pb-2 text-ink-soft hover:text-ink"
                  }
                  aria-current={isSelected ? "page" : undefined}
                >
                  <span className="font-medium">
                    {membership.organizationName}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Role: {membership.role}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <Link
          href={`/app/members?organization=${selected.organizationId}`}
          className="text-ink-soft underline"
        >
          Manage members
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
