"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { AuthActionState } from "@/features/auth/actions";
import { requestSchoolAdminPasswordRecoveryAction } from "@/features/auth/school-password-recovery";

const initialState: AuthActionState = { error: null, success: null };

/**
 * Controlled school-admin recovery request (platform reviews before issuing a link).
 */
export function SchoolAdminPasswordRecoveryForm() {
  const [state, formAction, pending] = useActionState(
    requestSchoolAdminPasswordRecoveryAction,
    initialState,
  );

  return (
    <section
      aria-labelledby="school-recovery-title"
      className="mx-auto w-full max-w-md px-6 py-16 sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        School administrators
      </p>
      <h1
        id="school-recovery-title"
        className="mt-2 font-display text-3xl tracking-tight text-ink"
      >
        Request password recovery
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        School admin passwords are reset through the platform team — not by an
        automatic email link. Submit a request; after verification, a secure
        reset link is shared through an approved channel.
      </p>

      <form action={formAction} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="recovery-email" className="block text-sm font-medium text-ink">
            Work email
          </label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="recovery-school"
            className="block text-sm font-medium text-ink"
          >
            School name or slug{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="recovery-school"
            name="school_hint"
            type="text"
            placeholder="e.g. Riverbend Academy"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="recovery-reason"
            className="block text-sm font-medium text-ink"
          >
            Why do you need a reset?
          </label>
          <textarea
            id="recovery-reason"
            name="reason"
            required
            rows={3}
            minLength={8}
            maxLength={500}
            placeholder="e.g. Forgotten password; verified school owner for Riverbend"
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
          className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper-elevated disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit recovery request"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have a recovery link?{" "}
        <Link href="/auth/sign-in" className="text-ink-soft underline">
          Sign in
        </Link>{" "}
        after resetting, or open the link from your platform contact.
      </p>
    </section>
  );
}
