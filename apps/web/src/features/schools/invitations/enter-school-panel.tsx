"use client";

import { useActionState } from "react";

import {
  activateSchoolInviteAction,
  type ActivateSchoolInviteState,
} from "@/features/schools/invitations/activate-actions";

const initial: ActivateSchoolInviteState = { error: null };

export function EnterSchoolPanel({
  token,
  email,
  schoolName,
}: {
  token: string;
  email: string;
  schoolName: string;
}) {
  const [state, action, pending] = useActionState(
    activateSchoolInviteAction,
    initial,
  );

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16 sm:px-10">
      <h1 className="font-display text-3xl tracking-tight text-ink">
        Enter your school
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        <span className="font-medium text-ink">{schoolName}</span> is ready.
        Continue as{" "}
        <span className="font-medium text-ink">{email}</span> — this email is
        fixed for this invitation. You can set a password after you enter the
        portal.
      </p>
      <dl className="mt-6 space-y-2 rounded-md border border-line bg-paper-elevated px-4 py-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">School</dt>
          <dd className="font-medium text-ink">{schoolName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Admin email</dt>
          <dd className="font-medium text-ink">{email}</dd>
        </div>
      </dl>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
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
          {pending ? "Opening school…" : "Open school dashboard"}
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">
        No separate signup step. If you already use this email elsewhere, you
        will be signed into that account for this school.
      </p>
    </section>
  );
}
