"use client";

import { useActionState, useId, useState } from "react";

import {
  type OnboardingActionState,
  provisionOrganizationAction,
} from "@/features/platform/onboarding/actions";
import { slugifyOrganizationName } from "@/features/platform/onboarding/slug";

const initialState: OnboardingActionState = { error: null, success: null };

type OnboardingFormProps = {
  idempotencyKey: string;
};

export function OnboardingForm({ idempotencyKey }: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    provisionOrganizationAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const formId = useId();

  return (
    <section
      aria-labelledby={`${formId}-title`}
      className="mx-auto w-full max-w-lg px-6 py-16 sm:px-10"
    >
      <h1
        id={`${formId}-title`}
        className="font-display text-3xl tracking-tight text-ink"
      >
        Create your organization
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This creates your institution, a default campus, and your owner
        membership in one step. Retries with the same request are safe.
      </p>

      <form action={formAction} className="mt-8 space-y-4" noValidate>
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-name`}
            className="block text-sm font-medium text-ink"
          >
            Organization name
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            required
            autoComplete="organization"
            value={name}
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (!slugTouched) {
                setSlug(slugifyOrganizationName(next));
              }
            }}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-slug`}
            className="block text-sm font-medium text-ink"
          >
            Slug
          </label>
          <input
            id={`${formId}-slug`}
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.trim().toLowerCase());
            }}
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:border-teal"
          />
          <p className="text-xs text-muted">
            Lowercase letters, numbers, and hyphens only. Used in URLs later.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-type`}
            className="block text-sm font-medium text-ink"
          >
            Institution type
          </label>
          <select
            id={`${formId}-type`}
            name="institution_type"
            required
            defaultValue="school"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          >
            <option value="school">School</option>
            <option value="academy">Academy</option>
            <option value="both">School and academy</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-campus`}
            className="block text-sm font-medium text-ink"
          >
            Default campus name
          </label>
          <input
            id={`${formId}-campus`}
            name="campus_name"
            type="text"
            defaultValue="Main campus"
            required
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper-elevated disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create organization"}
        </button>
      </form>
    </section>
  );
}
