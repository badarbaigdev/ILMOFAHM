"use client";

import { useActionState } from "react";

import {
  acceptSchoolInvitationAction,
  type AcceptSchoolInviteState,
} from "@/features/schools/invitations/actions";

const initialState: AcceptSchoolInviteState = {
  error: null,
  success: null,
};

export function AcceptSchoolInviteForm({
  token,
  email,
}: {
  token: string;
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    acceptSchoolInvitationAction,
    initialState,
  );

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16 sm:px-10">
      <h1 className="font-display text-3xl tracking-tight text-ink">
        Enter your school
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Signed in as {email ?? "your account"}. Accept to open your school
        dashboard and finish setup. Use the email address from your school
        registration.
      </p>
      <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm text-ink">
        <li>Confirm you are signed in with the invited email.</li>
        <li>Accept the invitation.</li>
        <li>You will go to school setup, then your school home.</li>
      </ol>
      <form action={formAction} className="mt-8 space-y-4">
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
          {pending ? "Opening school…" : "Accept and open school dashboard"}
        </button>
      </form>
    </section>
  );
}
