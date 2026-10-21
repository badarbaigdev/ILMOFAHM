import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  can,
  createSupabaseAuthorizationDeps,
} from "@/features/platform/authorization";
import {
  type ActiveMembershipSummary,
  listActiveMemberships,
} from "@/features/platform/onboarding/memberships";

export type OrgMemberRow = {
  id: string;
  userId: string;
  role: string;
  status: string;
  fullName: string | null;
};

export type PendingInvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

/**
 * Resolves which organization the UI should show.
 * `canInvite` / `canManageStatus` come from authorize()/can() — not from
 * comparing role strings in the page alone.
 */
export async function resolveManagedOrganization(
  supabase: SupabaseClient,
  userId: string,
  requestedOrgId: string | null | undefined,
): Promise<{
  memberships: ActiveMembershipSummary[];
  selected: ActiveMembershipSummary | null;
  canInvite: boolean;
  canManageStatus: boolean;
}> {
  const memberships = await listActiveMemberships(supabase, userId);
  const selected =
    memberships.find((m) => m.organizationId === requestedOrgId) ??
    memberships[0] ??
    null;

  if (!selected) {
    return {
      memberships,
      selected: null,
      canInvite: false,
      canManageStatus: false,
    };
  }

  const deps = createSupabaseAuthorizationDeps(supabase, { userId });

  const [canInvite, canManageStatus] = await Promise.all([
    can(
      {
        organizationId: selected.organizationId,
        permission: "membership.invite",
      },
      deps,
    ),
    can(
      {
        organizationId: selected.organizationId,
        permission: "membership.manage_status",
      },
      deps,
    ),
  ]);

  return { memberships, selected, canInvite, canManageStatus };
}

export async function listOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgMemberRow[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      `
      id,
      user_id,
      role,
      status,
      profiles (
        full_name
      )
    `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load members.");
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const fullName =
      profile &&
      typeof profile === "object" &&
      "full_name" in profile &&
      profile.full_name != null
        ? String(profile.full_name)
        : null;
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      fullName,
    };
  });
}

export async function listPendingInvitations(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<PendingInvitationRow[]> {
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    // Non-managers get empty via RLS; treat query failure as empty for UX.
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}
