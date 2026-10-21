import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { MembersPanel } from "@/features/platform/memberships/members-panel";
import {
  listOrganizationMembers,
  listPendingInvitations,
  resolveManagedOrganization,
} from "@/features/platform/memberships/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MembersPageProps = {
  searchParams: Promise<{ organization?: string }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app/members");
  }

  let memberships;
  let selected;
  let canInvite;
  let canManageStatus;
  try {
    ({ memberships, selected, canInvite, canManageStatus } =
      await resolveManagedOrganization(supabase, user.id, params.organization));
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Members
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load membership data.
        </p>
      </main>
    );
  }

  if (!selected) {
    redirect("/app/onboarding");
  }

  try {
    // Re-check membership.read for the resolved org — query param is not authority.
    await authorize(
      {
        organizationId: selected.organizationId,
        permission: "membership.read",
      },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (authError) {
    if (isAuthorizationError(authError)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-4xl tracking-tight text-ink">
            Members
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            {authError.message}
          </p>
        </main>
      );
    }
    throw authError;
  }

  let members;
  let invitations;
  try {
    members = await listOrganizationMembers(supabase, selected.organizationId);
    invitations = canInvite
      ? await listPendingInvitations(supabase, selected.organizationId)
      : [];
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Members
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load members for this organization.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/app" className="text-ink-soft underline">
            Back to workspace
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <div className="mx-auto w-full max-w-5xl px-6 pt-10 sm:px-10">
        <p className="text-sm text-muted">
          <Link
            href={`/app?organization=${selected.organizationId}`}
            className="underline"
          >
            Workspace
          </Link>
          {memberships.length > 1 ? (
            <>
              {" · "}
              Organizations:{" "}
              {memberships.map((m, index) => (
                <span key={m.organizationId}>
                  {index > 0 ? ", " : null}
                  <Link
                    href={`/app/members?organization=${m.organizationId}`}
                    className={
                      m.organizationId === selected.organizationId
                        ? "font-medium text-ink"
                        : "text-ink-soft underline"
                    }
                  >
                    {m.organizationName}
                  </Link>
                </span>
              ))}
            </>
          ) : null}
        </p>
      </div>
      <MembersPanel
        organizationId={selected.organizationId}
        organizationName={selected.organizationName}
        canInvite={canInvite}
        canManageStatus={canManageStatus}
        currentUserId={user.id}
        members={members}
        invitations={invitations}
      />
    </main>
  );
}
