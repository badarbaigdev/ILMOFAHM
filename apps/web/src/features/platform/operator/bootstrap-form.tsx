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

export function BootstrapPlatformOperatorForm({
  presetKey = "",
}: {
  /** Optional prefilled key from a one-time operator setup URL (not advertised publicly). */
  presetKey?: string;
}) {
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
        You must enter the server bootstrap secret. After any active operator
        exists, bootstrap is permanently disabled in the database.
      </p>
      <div className="space-y-1.5">
        <label
          htmlFor="bootstrap-secret"
          className="block text-sm font-medium text-ink"
        >
          Bootstrap secret
        </label>
        <input
          id="bootstrap-secret"
          name="bootstrap_secret"
          type="password"
          autoComplete="off"
          required
          defaultValue={presetKey}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        />
      </div>
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
