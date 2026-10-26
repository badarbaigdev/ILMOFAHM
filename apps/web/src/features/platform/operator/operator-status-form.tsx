"use client";

import { useActionState } from "react";

import {
  setPlatformOperatorStatusAction,
  type PlatformOperatorStatusActionState,
} from "@/features/platform/operator/actions";

const initial: PlatformOperatorStatusActionState = {
  error: null,
  success: null,
};

type OperatorStatusFormProps = {
  userId: string;
  currentStatus: string;
};

export function OperatorStatusForm({
  userId,
  currentStatus,
}: OperatorStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    setPlatformOperatorStatusAction,
    initial,
  );

  const actions =
    currentStatus === "active"
      ? ([
          { status: "suspended", label: "Suspend" },
          { status: "revoked", label: "Revoke" },
        ] as const)
      : ([{ status: "active", label: "Reactivate" }] as const);

  return (
    <div className="space-y-2">
      {state.error ? (
        <p role="alert" className="text-xs text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs text-teal">
          {state.success}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <form key={action.status} action={formAction}>
            <input type="hidden" name="user_id" value={userId} />
            <input type="hidden" name="status" value={action.status} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
