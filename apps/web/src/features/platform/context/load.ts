import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readContextCookies } from "@/features/platform/context/cookies";
import { resolveWorkspaceContext } from "@/features/platform/context/resolve";
import type {
  ContextCampus,
  ContextOrganization,
  WorkspaceContext,
} from "@/features/platform/context/types";
import { listActiveMemberships } from "@/features/platform/onboarding/memberships";

async function listVisibleCampuses(
  supabase: SupabaseClient,
): Promise<ContextCampus[]> {
  const { data, error } = await supabase
    .from("campuses")
    .select("id, organization_id, name, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load campuses.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    status: row.status,
  }));
}

/**
 * Loads membership-visible orgs/campuses and resolves selection.
 * Cookie and query hints are UX only — authorization still uses authorize().
 */
export async function loadWorkspaceContext(
  supabase: SupabaseClient,
  userId: string,
  hints?: {
    organizationId?: string | null;
    campusId?: string | null;
  },
): Promise<WorkspaceContext | null> {
  const memberships = await listActiveMemberships(supabase, userId);
  const organizations: ContextOrganization[] = memberships.map((m) => ({
    id: m.organizationId,
    name: m.organizationName,
    role: m.role,
    institutionType: m.institutionType,
  }));

  if (organizations.length === 0) {
    return null;
  }

  const campuses = await listVisibleCampuses(supabase);
  const cookie = await readContextCookies();

  // Preference: explicit request hint > cookie > first membership.
  return resolveWorkspaceContext({
    organizations,
    campuses,
    requestedOrganizationId:
      hints?.organizationId ?? cookie.organizationId ?? null,
    requestedCampusId: hints?.campusId ?? cookie.campusId ?? null,
  });
}
