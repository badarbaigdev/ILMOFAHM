import type {
  ContextCampus,
  ContextOrganization,
  WorkspaceContext,
} from "./types";

export type ResolveContextInput = {
  organizations: ContextOrganization[];
  campuses: ContextCampus[];
  /** Cookie / query / form hints — never treated as proof of access. */
  requestedOrganizationId?: string | null;
  requestedCampusId?: string | null;
};

/**
 * Picks org + campus only from membership-visible rows.
 * Unknown or cross-tenant IDs are ignored without leaking other tenants.
 */
export function resolveWorkspaceContext(
  input: ResolveContextInput,
): WorkspaceContext | null {
  const { organizations, campuses } = input;
  if (organizations.length === 0) {
    return null;
  }

  let ignoredInvalidSelection = false;

  const requestedOrg = input.requestedOrganizationId?.trim() || null;
  let organization =
    (requestedOrg
      ? organizations.find((org) => org.id === requestedOrg)
      : undefined) ?? undefined;

  if (requestedOrg && !organization) {
    ignoredInvalidSelection = true;
  }

  organization = organization ?? organizations[0];

  const orgCampuses = campuses.filter(
    (campus) =>
      campus.organizationId === organization.id && campus.status === "active",
  );

  const requestedCampus = input.requestedCampusId?.trim() || null;
  let campus =
    (requestedCampus
      ? orgCampuses.find((row) => row.id === requestedCampus)
      : undefined) ?? undefined;

  if (requestedCampus && !campus) {
    // Also ignore campuses that exist but belong to another visible org —
    // still no cross-tenant oracle; just fall back.
    ignoredInvalidSelection = true;
  }

  // If the campus hint was for a different org, drop it.
  if (campus && campus.organizationId !== organization.id) {
    campus = undefined;
    ignoredInvalidSelection = true;
  }

  campus = campus ?? orgCampuses[0] ?? null;

  return {
    organizations,
    allCampuses: campuses.filter((c) => c.status === "active"),
    campuses: orgCampuses,
    organization,
    campus,
    ignoredInvalidSelection,
  };
}
