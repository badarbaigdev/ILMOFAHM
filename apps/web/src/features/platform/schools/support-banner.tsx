"use client";

import { useActionState } from "react";

import {
  endSchoolSupportSessionAction,
  type PlatformSchoolAdminActionState,
} from "@/features/platform/schools/actions";

const initial: PlatformSchoolAdminActionState = {
  error: null,
  success: null,
};

export function SchoolSupportBanner({
  schoolId,
  schoolName,
  expiresAt,
  reason,
}: {
  schoolId: string;
  schoolName: string;
  expiresAt: string;
  reason: string;
}) {
  const [state, action, pending] = useActionState(
    endSchoolSupportSessionAction,
    initial,
  );

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:px-4 lg:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">Support access</span> · reviewing{" "}
          {schoolName} until {new Date(expiresAt).toLocaleString()}. {reason}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/platform/schools/${schoolId}`}
            className="text-sm font-medium text-amber-950 underline-offset-2 hover:underline"
          >
            Platform school page
          </a>
          <form action={action}>
            <input type="hidden" name="school_id" value={schoolId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-950 disabled:opacity-60"
            >
              {pending ? "Ending…" : "End session"}
            </button>
          </form>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
