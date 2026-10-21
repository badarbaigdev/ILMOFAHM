"use client";

import { useActionState } from "react";

import {
  type PlatformProvisionActionState,
  platformCreateOrganizationAction,
} from "@/features/platform/operator/actions";

const initialState: PlatformProvisionActionState = {
  error: null,
  success: null,
  createdAdmin: null,
};

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    platformCreateOrganizationAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 max-w-lg space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="org-name" className="block text-sm font-medium text-ink">
          Organization name
        </label>
        <input
          id="org-name"
          name="name"
          type="text"
          required
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="org-type"
          className="block text-sm font-medium text-ink"
        >
          Institution type
        </label>
        <select
          id="org-type"
          name="institution_type"
          defaultValue="school"
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          <option value="school">School</option>
          <option value="academy">Academy</option>
          <option value="both">School and academy</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="org-slug" className="block text-sm font-medium text-ink">
          Slug (optional)
        </label>
        <input
          id="org-slug"
          name="slug"
          type="text"
          placeholder="auto-generated from name"
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="campus-name"
          className="block text-sm font-medium text-ink"
        >
          Default campus name
        </label>
        <input
          id="campus-name"
          name="campus_name"
          type="text"
          defaultValue="Main campus"
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>

      <fieldset className="space-y-4 border-t border-line/70 pt-6">
        <legend className="text-sm font-semibold tracking-wide text-ink uppercase">
          Organization admin
        </legend>
        <p className="text-sm text-muted">
          Assign an existing account by email, or create a new admin with an
          optional password (generated if left blank).
        </p>

        <div className="space-y-1.5">
          <label
            htmlFor="admin-email"
            className="block text-sm font-medium text-ink"
          >
            Admin email
          </label>
          <input
            id="admin-email"
            name="admin_email"
            type="email"
            required
            autoComplete="off"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="admin-name"
            className="block text-sm font-medium text-ink"
          >
            Admin full name (optional)
          </label>
          <input
            id="admin-name"
            name="admin_full_name"
            type="text"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="admin-password"
            className="block text-sm font-medium text-ink"
          >
            Admin password (optional for new accounts)
          </label>
          <input
            id="admin-password"
            name="admin_password"
            type="text"
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-teal"
          />
        </div>
      </fieldset>

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

      {state.createdAdmin ? (
        <div
          role="status"
          className="rounded-md border border-line bg-paper-elevated p-4 text-sm"
        >
          <p className="font-medium text-ink">One-time admin credentials</p>
          <p className="mt-2 text-muted">
            Share securely with the organization admin, then discard.
          </p>
          <dl className="mt-3 space-y-1 font-mono text-ink">
            <div>
              <dt className="inline text-muted">Email: </dt>
              <dd className="inline">{state.createdAdmin.email}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Password: </dt>
              <dd className="inline">{state.createdAdmin.password}</dd>
            </div>
          </dl>
          <p className="mt-3 text-muted">
            They sign in at{" "}
            <span className="font-mono text-ink">/auth/sign-in</span> and land
            on their organization workspace at{" "}
            <span className="font-mono text-ink">/app</span>.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
