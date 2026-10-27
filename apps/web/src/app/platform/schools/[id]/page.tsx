import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { PlatformSchoolAdminPanel } from "@/features/platform/schools/school-admin-panel";
import { getActiveSchoolSupportSession } from "@/features/platform/schools/support";
import {
  listPendingSchoolInvitations,
  listSchoolMembers,
} from "@/features/schools/members/queries";
import { getSchoolProvisioningSnapshot } from "@/features/schools/platform-queries";
import { StatusBadge } from "@/features/schools/ui/data-table";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlatformSchoolDetailPage({ params }: PageProps) {
  const { id: schoolId } = await params;
  const { supabase, user } = await requirePlatformOperatorPage(
    "platform.schools.read",
  );

  const snapshot = await getSchoolProvisioningSnapshot(supabase, schoolId);
  if (!snapshot) {
    notFound();
  }

  let members;
  let invitations;
  let activeSupport = null;
  try {
    [members, invitations, activeSupport] = await Promise.all([
      listSchoolMembers(supabase, schoolId),
      listPendingSchoolInvitations(supabase, schoolId),
      getActiveSchoolSupportSession(supabase, schoolId, user.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {snapshot.schoolName}
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school administrators.
        </p>
      </main>
    );
  }

  // Enrich member emails via privileged Auth lookup (server-only).
  let membersWithEmail = members.map((m) => ({ ...m, email: null as string | null }));
  try {
    const admin = createServiceSupabaseClient();
    membersWithEmail = await Promise.all(
      members.map(async (member) => {
        const { data } = await admin.auth.admin.getUserById(member.userId);
        return {
          ...member,
          email: data.user?.email ?? null,
        };
      }),
    );
  } catch {
    // Fall back without emails if secret key is unavailable in this env.
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-sm text-muted">
        <Link
          href="/platform/schools"
          className="text-ink underline-offset-2 hover:underline"
        >
          Schools
        </Link>
        <span className="mx-1.5 text-line">/</span>
        {snapshot.schoolName}
      </p>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {snapshot.schoolName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <StatusBadge status={snapshot.schoolStatus} />
            {snapshot.schoolSlug ? (
              <>
                <span className="mx-2 text-line">·</span>/{snapshot.schoolSlug}
              </>
            ) : null}
            {snapshot.campusName ? (
              <>
                <span className="mx-2 text-line">·</span>
                {snapshot.campusName}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <PlatformSchoolAdminPanel
          schoolId={schoolId}
          schoolName={snapshot.schoolName}
          members={membersWithEmail}
          invitations={invitations}
          activeSupport={activeSupport}
        />
      </div>
    </main>
  );
}
