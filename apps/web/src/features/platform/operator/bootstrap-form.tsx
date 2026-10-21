"use client";

import { useActionState } from "react";

import {
  bootstrapFirstPlatformOperatorAction,
  type PlatformBootstrapActionState,
} from "@/features/platform/operator/actions";

const initial: PlatformBootstrapActionState = {
  error: null,
  success: null,
};

export function BootstrapPlatformOperatorForm() {
  const [state, formAction, pending] = useActionState(
    bootstrapFirstPlatformOperatorAction,
    initial,
  );

  return (
    <form action={formAction} className="mt-8 max-w-lg space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        This promotes your signed-in account to the first platform operator.
        After an active operator exists, this action is permanently disabled in
        the database.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper-elevated hover:bg-ink-soft disabled:opacity-60"
      >
        {pending ? "Bootstrapping…" : "Become platform operator"}
      </button>
    </form>
  );
}
