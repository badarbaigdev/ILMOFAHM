import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function resolveManagedOrganization(
  supabase: SupabaseClient,
  userId: string,
  requestedOrgId: string | null | undefined,
): Promise<{
  memberships: ActiveMembershipSummary[];
  selected: ActiveMembershipSummary | null;
  isManager: boolean;
}> {
  const memberships = await listActiveMemberships(supabase, userId);
  const selected =
    memberships.find((m) => m.organizationId === requestedOrgId) ??
    memberships[0] ??
    null;
  const isManager =
    selected != null &&
    (selected.role === "owner" || selected.role === "admin");
  return { memberships, selected, isManager };
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
