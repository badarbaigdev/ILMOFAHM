"use client";

import { useActionState, useState } from "react";

import {
  type ContextActionState,
  switchWorkspaceContextAction,
} from "@/features/platform/context/actions";
import type {
  ContextCampus,
  ContextOrganization,
} from "@/features/platform/context/types";

const initialState: ContextActionState = { error: null };

type ContextSelectorProps = {
  organizations: ContextOrganization[];
  campuses: ContextCampus[];
  organizationId: string;
  campusId: string | null;
  returnTo?: string;
};

/**
 * UX control for workspace context. Server action re-validates membership;
 * selection cookies are not authorization.
 */
export function ContextSelector({
  organizations,
  campuses,
  organizationId,
  campusId,
  returnTo = "/app",
}: ContextSelectorProps) {
  const [state, formAction, pending] = useActionState(
    switchWorkspaceContextAction,
    initialState,
  );
  const [selectedOrgId, setSelectedOrgId] = useState(organizationId);
  const orgCampuses = campuses.filter(
    (campus) => campus.organizationId === selectedOrgId,
  );
  const defaultCampus =
    orgCampuses.find((c) => c.id === campusId)?.id ?? orgCampuses[0]?.id ?? "";

  if (organizations.length === 0) {
    return null;
  }

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3"
      aria-label="Workspace context"
    >
      <input type="hidden" name="return_to" value={returnTo} />

      <div className="space-y-1">
        <label
          htmlFor="context-organization"
          className="block text-xs font-medium tracking-wide text-muted uppercase"
        >
          Organization
        </label>
        <select
          id="context-organization"
          name="organization_id"
          value={selectedOrgId}
          onChange={(event) => setSelectedOrgId(event.target.value)}
          className="min-w-[12rem] rounded-md border border-line bg-paper-elevated px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-teal"
        >
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="context-campus"
          className="block text-xs font-medium tracking-wide text-muted uppercase"
        >
          Campus
        </label>
        <select
          id="context-campus"
          name="campus_id"
          key={`${selectedOrgId}:${defaultCampus}`}
          defaultValue={defaultCampus}
          className="min-w-[10rem] rounded-md border border-line bg-paper-elevated px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-teal"
        >
          {orgCampuses.length === 0 ? (
            <option value="">No campuses</option>
          ) : (
            orgCampuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))
          )}
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-line bg-paper-elevated px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-60"
      >
        {pending ? "Switching…" : "Switch"}
      </button>

      {state.error ? (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
