"use client";

import { useActionState } from "react";

import {
  type CampusActionState,
  createCampusAction,
  updateCampusAction,
} from "@/features/institution/campuses/actions";
import type { CampusRow } from "@/features/institution/campuses/queries";

const initialState: CampusActionState = { error: null, success: null };

type CampusesPanelProps = {
  organizationId: string;
  campuses: CampusRow[];
  canManage: boolean;
};

function CreateCampusForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(
    createCampusAction,
    initialState,
  );

  return (
    <section aria-labelledby="create-campus-heading" className="mt-8">
      <h3
        id="create-campus-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Add campus
      </h3>
      <form action={formAction} className="mt-4 max-w-md space-y-3" noValidate>
        <input type="hidden" name="organization_id" value={organizationId} />
        <div className="space-y-1.5">
          <label
            htmlFor="new-campus-name"
            className="block text-sm font-medium text-ink"
          >
            Name
          </label>
          <input
            id="new-campus-name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-campus-code"
            className="block text-sm font-medium text-ink"
          >
            Code (optional)
          </label>
          <input
            id="new-campus-code"
            name="code"
            type="text"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-campus-phone"
            className="block text-sm font-medium text-ink"
          >
            Phone (optional)
          </label>
          <input
            id="new-campus-phone"
            name="phone"
            type="tel"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-campus-email"
            className="block text-sm font-medium text-ink"
          >
            Email (optional)
          </label>
          <input
            id="new-campus-email"
            name="email"
            type="email"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-campus-address"
            className="block text-sm font-medium text-ink"
          >
            Address (optional)
          </label>
          <input
            id="new-campus-address"
            name="address_line"
            type="text"
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
          {pending ? "Creating…" : "Create campus"}
        </button>
      </form>
    </section>
  );
}

function EditCampusForm({
  organizationId,
  campus,
}: {
  organizationId: string;
  campus: CampusRow;
}) {
  const [state, formAction, pending] = useActionState(
    updateCampusAction,
    initialState,
  );

  return (
    <li className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="font-medium text-ink">
        {campus.name}
        <span className="ml-2 text-sm font-normal text-muted">
          {campus.status}
        </span>
      </h3>
      <form action={formAction} className="mt-3 max-w-md space-y-3" noValidate>
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="campus_id" value={campus.id} />
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-name-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Name
          </label>
          <input
            id={`campus-name-${campus.id}`}
            name="name"
            type="text"
            required
            defaultValue={campus.name}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-code-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Code
          </label>
          <input
            id={`campus-code-${campus.id}`}
            name="code"
            type="text"
            defaultValue={campus.code ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-phone-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Phone
          </label>
          <input
            id={`campus-phone-${campus.id}`}
            name="phone"
            type="tel"
            defaultValue={campus.phone ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-email-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            id={`campus-email-${campus.id}`}
            name="email"
            type="email"
            defaultValue={campus.email ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-address-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Address
          </label>
          <input
            id={`campus-address-${campus.id}`}
            name="address_line"
            type="text"
            defaultValue={campus.addressLine ?? ""}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`campus-status-${campus.id}`}
            className="block text-sm font-medium text-ink"
          >
            Status
          </label>
          <select
            id={`campus-status-${campus.id}`}
            name="status"
            defaultValue={campus.status}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
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
          {pending ? "Saving…" : "Save campus"}
        </button>
      </form>
    </li>
  );
}

export function CampusesPanel({
  organizationId,
  campuses,
  canManage,
}: CampusesPanelProps) {
  return (
    <section aria-labelledby="campuses-heading" className="mt-14">
      <h2
        id="campuses-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Campuses
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Branches for this organization. Archived campuses stay in history but
        cannot be selected for new campus-scoped actions.
      </p>

      {campuses.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted">
          No campuses yet.
        </p>
      ) : canManage ? (
        <ul className="mt-6 space-y-6">
          {campuses.map((campus) => (
            <EditCampusForm
              key={campus.id}
              organizationId={organizationId}
              campus={campus}
            />
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-3 text-sm text-ink-soft">
          {campuses.map((campus) => (
            <li key={campus.id}>
              <span className="font-medium text-ink">{campus.name}</span>
              {campus.code ? ` · ${campus.code}` : ""}
              {` · ${campus.status}`}
              {campus.phone ? ` · ${campus.phone}` : ""}
              {campus.email ? ` · ${campus.email}` : ""}
            </li>
          ))}
        </ul>
      )}

      {canManage ? <CreateCampusForm organizationId={organizationId} /> : null}
      {!canManage ? (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can add or edit campuses.
        </p>
      ) : null}
    </section>
  );
}
