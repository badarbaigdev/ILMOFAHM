"use client";

import { useActionState } from "react";

import {
  type BrandingActionState,
  updateCampusBrandingOverridesAction,
  updateOrganizationBrandingAction,
} from "@/features/institution/branding/actions";
import { resolveEffectiveBranding } from "@/features/institution/branding/resolve";
import type { CampusRow } from "@/features/institution/campuses/queries";

const initialState: BrandingActionState = { error: null, success: null };

type BrandingPanelProps = {
  organizationId: string;
  organizationName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
  campuses: CampusRow[];
  canUpdateOrganization: boolean;
  canManageCampuses: boolean;
};

function OrganizationBrandingForm({
  organizationId,
  contactEmail,
  contactPhone,
  websiteUrl,
  brandDisplayName,
  brandPrimaryColor,
  brandLogoUrl,
}: {
  organizationId: string;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationBrandingAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 max-w-md space-y-3" noValidate>
      <input type="hidden" name="organization_id" value={organizationId} />
      <div className="space-y-1.5">
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-ink"
        >
          Contact email
        </label>
        <input
          id="contact-email"
          name="contact_email"
          type="email"
          defaultValue={contactEmail ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="contact-phone"
          className="block text-sm font-medium text-ink"
        >
          Contact phone
        </label>
        <input
          id="contact-phone"
          name="contact_phone"
          type="tel"
          defaultValue={contactPhone ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="website-url"
          className="block text-sm font-medium text-ink"
        >
          Website
        </label>
        <input
          id="website-url"
          name="website_url"
          type="url"
          placeholder="https://"
          defaultValue={websiteUrl ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="brand-display-name"
          className="block text-sm font-medium text-ink"
        >
          Brand display name
        </label>
        <input
          id="brand-display-name"
          name="brand_display_name"
          type="text"
          defaultValue={brandDisplayName ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="brand-primary-color"
          className="block text-sm font-medium text-ink"
        >
          Brand color (#RRGGBB)
        </label>
        <input
          id="brand-primary-color"
          name="brand_primary_color"
          type="text"
          placeholder="#0F766E"
          defaultValue={brandPrimaryColor ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-teal"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="brand-logo-url"
          className="block text-sm font-medium text-ink"
        >
          Logo URL (https)
        </label>
        <input
          id="brand-logo-url"
          name="brand_logo_url"
          type="url"
          placeholder="https://"
          defaultValue={brandLogoUrl ?? ""}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
        <p className="text-xs text-muted">
          URL only for now. Private logo uploads arrive later. Receipt templates
          are out of scope.
        </p>
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
        {pending ? "Saving…" : "Save branding"}
      </button>
    </form>
  );
}

function CampusOverrideForm({
  organizationId,
  campus,
}: {
  organizationId: string;
  campus: CampusRow;
}) {
  const [state, formAction, pending] = useActionState(
    updateCampusBrandingOverridesAction,
    initialState,
  );

  return (
    <li className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="font-medium text-ink">{campus.name}</h3>
      <p className="mt-1 text-xs text-muted">
        Leave fields blank to inherit organization branding.
      </p>
      <form action={formAction} className="mt-3 max-w-md space-y-3" noValidate>
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="campus_id" value={campus.id} />
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-brand-name-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Display name override
          </label>
          <input
            id={`campus-brand-name-${campus.id}`}
            name="brand_display_name"
            type="text"
            defaultValue={campus.brandDisplayName ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-brand-color-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Color override
          </label>
          <input
            id={`campus-brand-color-${campus.id}`}
            name="brand_primary_color"
            type="text"
            placeholder="#134E4A"
            defaultValue={campus.brandPrimaryColor ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-brand-logo-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Logo URL override
          </label>
          <input
            id={`campus-brand-logo-${campus.id}`}
            name="brand_logo_url"
            type="url"
            defaultValue={campus.brandLogoUrl ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
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
          {pending ? "Saving…" : "Save campus overrides"}
        </button>
      </form>
    </li>
  );
}

export function BrandingPanel({
  organizationId,
  organizationName,
  contactEmail,
  contactPhone,
  websiteUrl,
  brandDisplayName,
  brandPrimaryColor,
  brandLogoUrl,
  campuses,
  canUpdateOrganization,
  canManageCampuses,
}: BrandingPanelProps) {
  const preview = resolveEffectiveBranding({
    name: organizationName,
    brandDisplayName,
    brandPrimaryColor,
    brandLogoUrl,
  });

  return (
    <section aria-labelledby="branding-heading" className="mt-14">
      <h2
        id="branding-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Branding and contact
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Institution contact details and brand presentation. Campuses may
        override branding; blank campus fields inherit the organization.
      </p>

      <div
        className="mt-4 flex items-center gap-3 text-sm text-ink-soft"
        role="status"
      >
        <span
          aria-hidden
          className="inline-block h-8 w-8 rounded-md border border-line"
          style={{
            backgroundColor: preview.primaryColor ?? "transparent",
          }}
        />
        <span>
          Preview:{" "}
          <span className="font-medium text-ink">{preview.displayName}</span>
          {preview.logoUrl ? (
            <span className="text-muted"> · logo set</span>
          ) : null}
        </span>
      </div>

      {canUpdateOrganization ? (
        <OrganizationBrandingForm
          organizationId={organizationId}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          websiteUrl={websiteUrl}
          brandDisplayName={brandDisplayName}
          brandPrimaryColor={brandPrimaryColor}
          brandLogoUrl={brandLogoUrl}
        />
      ) : (
        <dl className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Email
            </dt>
            <dd className="text-ink">{contactEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Phone
            </dt>
            <dd className="text-ink">{contactPhone ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">
              Website
            </dt>
            <dd className="text-ink">{websiteUrl ?? "—"}</dd>
          </div>
        </dl>
      )}

      {canManageCampuses && campuses.length > 0 ? (
        <div className="mt-10">
          <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Campus branding overrides
          </h3>
          <ul className="mt-4 space-y-6">
            {campuses.map((campus) => (
              <CampusOverrideForm
                key={campus.id}
                organizationId={organizationId}
                campus={campus}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
