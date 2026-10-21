"use client";

import { useActionState } from "react";

import {
  institutionTypeLabel,
  supportsAcademy,
  supportsSchool,
  type InstitutionType,
} from "@/features/institution/mode";
import {
  type OrganizationProfileActionState,
  updateOrganizationProfileAction,
} from "@/features/institution/profile/actions";

const initialState: OrganizationProfileActionState = {
  error: null,
  success: null,
};

type OrganizationProfileFormProps = {
  organizationId: string;
  name: string;
  slug: string | null;
  institutionType: InstitutionType;
  status: string;
  timezone: string;
  locale: string;
  canUpdate: boolean;
};

export function OrganizationProfileForm({
  organizationId,
  name,
  slug,
  institutionType,
  status,
  timezone,
  locale,
  canUpdate,
}: OrganizationProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationProfileAction,
    initialState,
  );

  const schoolEnabled = supportsSchool(institutionType);
  const academyEnabled = supportsAcademy(institutionType);

  return (
    <section aria-labelledby="org-profile-heading" className="mt-10">
      <h2
        id="org-profile-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Organization profile
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Operating mode controls which academic workflows are available. School
        and academy fields stay separate so one mode never blocks the other.
      </p>

      <dl className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Slug</dt>
          <dd className="font-mono text-ink">{slug ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Status</dt>
          <dd className="text-ink">{status}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">
            Timezone
          </dt>
          <dd className="text-ink">{timezone}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Locale</dt>
          <dd className="text-ink">{locale}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-ink-soft" role="status">
        Enabled workflows:{" "}
        {[
          schoolEnabled ? "school structure" : null,
          academyEnabled ? "academy courses" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "none"}{" "}
        (current mode: {institutionTypeLabel(institutionType)})
      </p>

      {canUpdate ? (
        <form
          action={formAction}
          className="mt-6 max-w-md space-y-4"
          noValidate
        >
          <input type="hidden" name="organization_id" value={organizationId} />

          <div className="space-y-1.5">
            <label
              htmlFor="org-name"
              className="block text-sm font-medium text-ink"
            >
              Organization name
            </label>
            <input
              id="org-name"
              name="name"
              type="text"
              required
              defaultValue={name}
              autoComplete="organization"
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="org-institution-type"
              className="block text-sm font-medium text-ink"
            >
              Institution type
            </label>
            <select
              id="org-institution-type"
              name="institution_type"
              required
              defaultValue={institutionType}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            >
              <option value="school">School</option>
              <option value="academy">Academy</option>
              <option value="both">School and academy</option>
            </select>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-red-700">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="text-sm text-teal">
              {state.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : (
        <p role="status" className="mt-6 text-sm text-muted">
          You can view this profile. Only owners and admins can change the
          organization name or operating mode.
        </p>
      )}
    </section>
  );
}
