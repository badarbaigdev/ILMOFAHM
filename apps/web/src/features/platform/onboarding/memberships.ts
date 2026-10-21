import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveMembershipSummary = {
  organizationId: string;
  organizationName: string;
  institutionType: string;
  role: string;
  status: string;
};

/**
 * Lists active memberships for the signed-in user.
 * Relies on RLS (own/member select) — never takes a client org id as authority.
 */
export async function listActiveMemberships(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveMembershipSummary[]> {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      `
      role,
      status,
      organization_id,
      organizations (
        id,
        name,
        institution_type
      )
    `,
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error("Could not load organization memberships.");
  }

  const rows = data ?? [];
  const summaries: ActiveMembershipSummary[] = [];

  for (const row of rows) {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    if (
      !org ||
      typeof org !== "object" ||
      !("id" in org) ||
      !("name" in org) ||
      !("institution_type" in org)
    ) {
      continue;
    }
    summaries.push({
      organizationId: String(org.id),
      organizationName: String(org.name),
      institutionType: String(org.institution_type),
      role: row.role,
      status: row.status,
    });
  }

  return summaries;
}
