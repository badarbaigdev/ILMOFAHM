"use client";

import { useActionState, useState } from "react";

import {
  approveSchoolApplicationAction,
  type ApproveSchoolApplicationState,
  reviewSchoolApplicationAction,
  type ReviewSchoolApplicationState,
} from "@/features/school-applications/review-actions";
import {
  canApproveApplication,
  reviewTargetsFor,
  schoolApplicationStatusLabel,
  type SchoolApplicationStatus,
} from "@/features/school-applications/transitions";

const initialReviewState: ReviewSchoolApplicationState = {
  error: null,
  success: null,
};

const initialApproveState: ApproveSchoolApplicationState = {
  error: null,
  success: null,
  invitationToken: null,
  schoolId: null,
  alreadyProvisioned: false,
};

type Props = {
  applicationId: string;
  status: SchoolApplicationStatus;
  currentReviewNotes: string | null;
};

export function SchoolApplicationReviewForms({
  applicationId,
  status,
  currentReviewNotes,
}: Props) {
  const reviewTargets = reviewTargetsFor(status);
  const showApprove = canApproveApplication(status) || status === "approved";
  const alreadyApproved = status === "approved";

  const [toStatus, setToStatus] = useState<SchoolApplicationStatus | "">(
    reviewTargets[0] ?? "",
  );
  const [reviewState, reviewAction, reviewPending] = useActionState(
    reviewSchoolApplicationAction,
    initialReviewState,
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approveSchoolApplicationAction,
    initialApproveState,
  );

  return (
    <div className="mt-10 space-y-10">
      {reviewTargets.length > 0 ? (
        <section aria-labelledby="review-heading">
          <h2
            id="review-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Update status
          </h2>
          <form
            action={reviewAction}
            className="mt-4 max-w-lg space-y-4"
            noValidate
          >
            <input type="hidden" name="application_id" value={applicationId} />
            <input type="hidden" name="from_status" value={status} />

            <div className="space-y-1.5">
              <label
                htmlFor="to-status"
                className="block text-sm font-medium text-ink"
              >
                New status
              </label>
              <select
                id="to-status"
                name="to_status"
                value={toStatus}
                onChange={(e) =>
                  setToStatus(e.target.value as SchoolApplicationStatus)
                }
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                {reviewTargets.map((target) => (
                  <option key={target} value={target}>
                    {schoolApplicationStatusLabel(target)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="review-notes"
                className="block text-sm font-medium text-ink"
              >
                Review notes (optional)
              </label>
              <textarea
                id="review-notes"
                name="review_notes"
                rows={3}
                defaultValue={currentReviewNotes ?? ""}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>

            {toStatus === "rejected" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="rejection-reason"
                  className="block text-sm font-medium text-ink"
                >
                  Rejection reason
                </label>
                <textarea
                  id="rejection-reason"
                  name="rejection_reason"
                  rows={3}
                  required
                  className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
                />
              </div>
            ) : null}

            {toStatus === "information_requested" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="information-request"
                  className="block text-sm font-medium text-ink"
                >
                  Information request
                </label>
                <textarea
                  id="information-request"
                  name="information_request"
                  rows={3}
                  required
                  className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
                />
              </div>
            ) : null}

            {reviewState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {reviewState.error}
              </p>
            ) : null}
            {reviewState.success ? (
              <p role="status" className="text-sm text-teal">
                {reviewState.success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={reviewPending || !toStatus}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
            >
              {reviewPending ? "Saving…" : "Save status"}
            </button>
          </form>
        </section>
      ) : null}

      {showApprove ? (
        <section aria-labelledby="approve-heading">
          <h2
            id="approve-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            {alreadyApproved ? "Provisioning" : "Approve and provision"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            {alreadyApproved
              ? "This application is approved. Re-running approval is idempotent and will not create a second school."
              : "Approval creates the school tenant, a default campus, and a one-time owner invitation token. Email delivery comes in a later phase."}
          </p>
          <form
            action={approveAction}
            className="mt-4 max-w-lg space-y-4"
            noValidate
          >
            <input type="hidden" name="application_id" value={applicationId} />
            <input type="hidden" name="from_status" value={status} />

            {!alreadyApproved ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="approve-notes"
                    className="block text-sm font-medium text-ink"
                  >
                    Review notes (optional)
                  </label>
                  <textarea
                    id="approve-notes"
                    name="review_notes"
                    rows={2}
                    defaultValue={currentReviewNotes ?? ""}
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
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="confirm_approve"
                    value="yes"
                    required
                    className="mt-1"
                  />
                  <span>
                    I confirm approval and controlled school provisioning for
                    this application.
                  </span>
                </label>
              </>
            ) : (
              <input type="hidden" name="confirm_approve" value="yes" />
            )}

            {approveState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {approveState.error}
              </p>
            ) : null}
            {approveState.success ? (
              <div role="status" className="space-y-2 text-sm text-teal">
                <p>{approveState.success}</p>
                {approveState.schoolId ? (
                  <p className="font-mono text-xs text-muted">
                    School id: {approveState.schoolId}
                  </p>
                ) : null}
                {approveState.invitationToken ? (
                  <p className="break-all font-mono text-xs text-ink">
                    Owner invitation token (shown once):{" "}
                    {approveState.invitationToken}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={approvePending}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {approvePending
                ? "Working…"
                : alreadyApproved
                  ? "Re-check provisioning"
                  : "Approve application"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
