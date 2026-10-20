"use client";

import { useActionState } from "react";

import {
  type MembershipActionState,
  acceptInvitationAction,
} from "@/features/platform/memberships/actions";

const initialState: MembershipActionState = {
  error: null,
  success: null,
};

export function AcceptInviteForm({
  token,
  email,
}: {
  token: string;
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    initialState,
  );

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16 sm:px-10">
      <h1 className="font-display text-3xl tracking-tight text-ink">
        Accept invitation
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You are signed in as {email ?? "your account"}. Accepting attaches you
        only to the organization named in this invite.
      </p>
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
          {pending ? "Accepting…" : "Join organization"}
        </button>
      </form>
    </section>
  );
}
