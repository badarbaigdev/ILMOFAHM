import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorize,
  can,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { MembersPanel } from "@/features/platform/memberships/members-panel";
import {
  listOrganizationMembers,
  listPendingInvitations,
} from "@/features/platform/memberships/queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type MembersPageProps = {
  searchParams: Promise<{ organization?: string; campus?: string }>;
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

  if (!context) {
    redirect("/app/onboarding");
  }

  const deps = createSupabaseAuthorizationDeps(supabase, { user });

  try {
    await authorize(
      {
        organizationId: context.organization.id,
        permission: "membership.read",
      },
      deps,
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

  const [canInvite, canManageStatus] = await Promise.all([
    can(
      {
        organizationId: context.organization.id,
        permission: "membership.invite",
      },
      deps,
    ),
    can(
      {
        organizationId: context.organization.id,
        permission: "membership.manage_status",
      },
      deps,
    ),
  ]);

  let members;
  let invitations;
  try {
    members = await listOrganizationMembers(supabase, context.organization.id);
    invitations = canInvite
      ? await listPendingInvitations(supabase, context.organization.id)
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
      <div className="mx-auto w-full max-w-5xl px-6 pt-12 sm:px-10 sm:pt-16">
        <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
          Access
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
          Members
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Invitations and membership for{" "}
          <span className="font-medium text-ink">
            {context.organization.name}
          </span>
          .
        </p>
        <div className="mt-8">
          <ContextSelector
            organizations={context.organizations}
            campuses={context.allCampuses}
            organizationId={context.organization.id}
            campusId={context.campus?.id ?? null}
            returnTo="/app/members"
          />
        </div>
      </div>
      <MembersPanel
        organizationId={context.organization.id}
        organizationName={context.organization.name}
        canInvite={canInvite}
        canManageStatus={canManageStatus}
        currentUserId={user.id}
        members={members}
        invitations={invitations}
      />
    </main>
  );
}
