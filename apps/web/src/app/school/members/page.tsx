import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolMembersPanel } from "@/features/schools/members/members-panel";
import {
  listPendingSchoolInvitations,
  listSchoolMembers,
} from "@/features/schools/members/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolMembersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/members?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/members";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  let loaded;
  try {
    loaded = await loadSchoolContext(
      supabase,
      user.id,
      requestedSchoolId,
      hostSchoolSlug ?? undefined,
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Members
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school memberships.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Members
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to manage people.
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/auth/accept-school-invite"
            className="text-ink underline-offset-2 hover:underline"
          >
            Accept a school invite
          </Link>
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(
      supabase,
      user.id,
      active.school.id,
      "membership.read",
    );
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-3xl tracking-tight text-ink">
            Members
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error.message}
          </p>
          <p className="mt-6 text-sm">
            <Link
              href={`/school?school=${active.school.id}`}
              className="text-ink underline-offset-2 hover:underline"
            >
              Back to school home
            </Link>
          </p>
        </main>
      );
    }
    throw error;
  }

  let members;
  let invitations;
  try {
    [members, invitations] = await Promise.all([
      listSchoolMembers(supabase, active.school.id),
      listPendingSchoolInvitations(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Members
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load members or invitations.
        </p>
      </main>
    );
  }

  const [canInvite, canManageStatus, canManageRole] = await Promise.all([
    canSchool(supabase, user.id, active.school.id, "membership.invite"),
    canSchool(supabase, user.id, active.school.id, "membership.manage_status"),
    canSchool(supabase, user.id, active.school.id, "membership.manage_role"),
  ]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        School portal
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Members · {active.school.name}
      </h1>
      <p className="mt-3 text-muted">
        Invite staff, change roles, and suspend or revoke access. Authorization
        is enforced on the server for every action.
      </p>
      <p className="mt-4 text-sm">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Back to school home
        </Link>
      </p>

      <div className="mt-8">
        <SchoolMembersPanel
          schoolId={active.school.id}
          schoolName={active.school.name}
          canInvite={canInvite}
          canManageStatus={canManageStatus}
          canManageRole={canManageRole}
          currentUserId={user.id}
          members={members}
          invitations={invitations}
        />
      </div>
    </main>
  );
}
