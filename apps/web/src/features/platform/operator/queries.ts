import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformOrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  institutionType: string;
  status: string;
  createdAt: string;
  ownerUserId: string | null;
  ownerFullName: string | null;
};

export type PlatformDashboardStats = {
  organizationCount: number;
  activeOrganizationCount: number;
  trialOrganizationCount: number;
  operatorCount: number;
};

export async function listPlatformOrganizations(
  supabase: SupabaseClient,
): Promise<PlatformOrganizationRow[]> {
  const { data, error } = await supabase.rpc("platform_list_organizations");
  if (error) {
    throw new Error("Could not load organizations.");
  }

  return (data ?? []).map(
    (row: {
      organization_id: string;
      name: string;
      slug: string | null;
      institution_type: string;
      status: string;
      created_at: string;
      owner_user_id: string | null;
      owner_full_name: string | null;
    }) => ({
      id: row.organization_id,
      name: row.name,
      slug: row.slug,
      institutionType: row.institution_type,
      status: row.status,
      createdAt: row.created_at,
      ownerUserId: row.owner_user_id,
      ownerFullName: row.owner_full_name,
    }),
  );
}

export type PlatformOperatorRow = {
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  fullName: string | null;
};

export async function listPlatformOperators(
  supabase: SupabaseClient,
): Promise<PlatformOperatorRow[]> {
  const { data, error } = await supabase
    .from("platform_operators")
    .select("user_id, role, status, created_at, updated_at, profiles(full_name)")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load platform operators.");
  }

  return (data ?? []).map(
    (row: {
      user_id: string;
      role: string;
      status: string;
      created_at: string;
      updated_at: string;
      profiles:
        | { full_name: string | null }
        | { full_name: string | null }[]
        | null;
    }) => {
      const profile = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      return {
        userId: row.user_id,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        fullName: profile?.full_name ?? null,
      };
    },
  );
}

export async function getPlatformDashboardStats(
  supabase: SupabaseClient,
): Promise<PlatformDashboardStats> {
  const { data, error } = await supabase.rpc("platform_dashboard_stats");
  if (error) {
    throw new Error("Could not load platform statistics.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      organizationCount: 0,
      activeOrganizationCount: 0,
      trialOrganizationCount: 0,
      operatorCount: 0,
    };
  }

  return {
    organizationCount: Number(row.organization_count ?? 0),
    activeOrganizationCount: Number(row.active_organization_count ?? 0),
    trialOrganizationCount: Number(row.trial_organization_count ?? 0),
    operatorCount: Number(row.operator_count ?? 0),
  };
}
