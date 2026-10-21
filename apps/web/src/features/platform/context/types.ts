export type ContextOrganization = {
  id: string;
  name: string;
  role: string;
  /** school | academy | both — UX gating only; authorize() still required. */
  institutionType: string;
};

export type ContextCampus = {
  id: string;
  organizationId: string;
  name: string;
  status: string;
};

/**
 * Selected workspace context for UX defaults only.
 * Never treat this as authorization — always call authorize().
 */
export type WorkspaceContext = {
  organizations: ContextOrganization[];
  /** Every campus visible via membership (any org). Used by the selector. */
  allCampuses: ContextCampus[];
  /** Campuses belonging to the selected organization only. */
  campuses: ContextCampus[];
  organization: ContextOrganization;
  campus: ContextCampus | null;
  /** True when a requested id was ignored because it was not assigned. */
  ignoredInvalidSelection: boolean;
};

export const ORG_CONTEXT_COOKIE = "ilm_organization_id";
export const CAMPUS_CONTEXT_COOKIE = "ilm_campus_id";
