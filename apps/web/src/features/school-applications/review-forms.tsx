"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  DialogField,
  DialogTextarea,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
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
import {
  FreshActivationLinkPanel,
  ReissueActivationLinkPanel,
} from "@/features/schools/invitations/share-activation-link";
import {
  provisionSchoolFromApplicationAction,
  type ProvisionSchoolActionState,
} from "@/features/schools/provision-actions";

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

const initialProvisionState: ProvisionSchoolActionState = {
  error: null,
  success: null,
  invitationToken: null,
  schoolId: null,
  alreadyProvisioned: false,
  healed: false,
};

type Props = {
  applicationId: string;
  status: SchoolApplicationStatus;
  currentReviewNotes: string | null;
  provisionedSchoolId: string | null;
  provisioningComplete: boolean | null;
  applicantEmail: string;
  schoolName: string;
  invitationStatus: string | null;
};

export function SchoolApplicationReviewForms({
  applicationId,
  status,
  currentReviewNotes,
  provisionedSchoolId,
  provisioningComplete,
  applicantEmail,
  schoolName,
  invitationStatus,
}: Props) {
  const reviewTargets = reviewTargetsFor(status);
  const showApprove = canApproveApplication(status);
  const alreadyApproved = status === "approved";
  const showProvision =
    alreadyApproved &&
    (provisionedSchoolId === null || provisioningComplete === false);
  const showSharePanel =
    alreadyApproved &&
    Boolean(provisionedSchoolId) &&
    provisioningComplete !== false;

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
  const [provisionState, provisionAction, provisionPending] = useActionState(
    provisionSchoolFromApplicationAction,
    initialProvisionState,
  );

  const reviewDialog = useActionDialog(reviewState);
  const approveDialog = useActionDialog(approveState);
  const provisionDialog = useActionDialog(provisionState);

  const freshToken =
    approveState.invitationToken ?? provisionState.invitationToken ?? null;

  return (
    <div className="mt-10 space-y-8">
      <div className="flex flex-wrap gap-2">
        {reviewTargets.length > 0 ? (
          <button
            type="button"
            onClick={reviewDialog.openDialog}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            Update status
          </button>
        ) : null}
        {showApprove ? (
          <button
            type="button"
            onClick={approveDialog.openDialog}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Approve &amp; create school
          </button>
        ) : null}
        {showProvision ? (
          <button
            type="button"
            onClick={provisionDialog.openDialog}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Complete school creation
          </button>
        ) : null}
      </div>

      <p className="text-sm text-muted">
        Current status:{" "}
        <span className="font-medium text-ink">
          {schoolApplicationStatusLabel(status)}
        </span>
        . Use status updates for under review, information requests, or
        rejection. Final approval creates the school workspace.
      </p>

      <FormDialog
        open={reviewDialog.open}
        onClose={reviewDialog.closeDialog}
        title="Update application status"
        description="Review notes and outcome for this school request."
        submitLabel="Save status"
        formAction={reviewAction}
        busy={reviewPending}
        dirty={reviewDialog.dirty}
        onDirtyChange={reviewDialog.setDirty}
        error={reviewState.error}
        tone={toStatus === "rejected" ? "danger" : "default"}
      >
        <input type="hidden" name="application_id" value={applicationId} />
        <input type="hidden" name="from_status" value={status} />
        <div className="space-y-1.5">
          <label htmlFor="to_status" className="block text-sm font-medium text-ink">
            New status <span className="text-red-700">*</span>
          </label>
          <select
            id="to_status"
            name="to_status"
            value={toStatus}
            onChange={(e) =>
              setToStatus(e.target.value as SchoolApplicationStatus | "")
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
        <DialogTextarea
          id="review_notes"
          name="review_notes"
          label="Review notes (optional)"
          rows={2}
          defaultValue={currentReviewNotes ?? ""}
        />
        {toStatus === "rejected" ? (
          <DialogTextarea
            id="rejection_reason"
            name="rejection_reason"
            label="Rejection reason"
            required
            rows={2}
          />
        ) : null}
        {toStatus === "information_requested" ? (
          <DialogTextarea
            id="information_request"
            name="information_request"
            label="Information request"
            required
            rows={2}
          />
        ) : null}
      </FormDialog>

      <FormDialog
        open={approveDialog.open}
        onClose={approveDialog.closeDialog}
        title="Approve and create school"
        description={`Creates the school, a default campus, and an activation link for ${applicantEmail}.`}
        submitLabel="Approve and create school"
        formAction={approveAction}
        busy={approvePending}
        dirty={approveDialog.dirty}
        onDirtyChange={approveDialog.setDirty}
        error={approveState.error}
      >
        <input type="hidden" name="application_id" value={applicationId} />
        <input type="hidden" name="from_status" value={status} />
        <DialogTextarea
          id="approve-notes"
          name="review_notes"
          label="Review notes (optional)"
          rows={2}
          defaultValue={currentReviewNotes ?? ""}
        />
        <DialogField
          id="campus-name"
          name="campus_name"
          label="Default campus name"
          defaultValue="Main campus"
        />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="confirm_approve"
            value="yes"
            required
            className="mt-1"
          />
          <span>
            I confirm approval and school provisioning for{" "}
            <strong>{schoolName}</strong>.
          </span>
        </label>
      </FormDialog>

      <FormDialog
        open={provisionDialog.open}
        onClose={provisionDialog.closeDialog}
        title="Complete school creation"
        description={
          provisionedSchoolId
            ? "Something is incomplete (campus or invitation). Retry is safe."
            : "This application is approved but the school was not created yet."
        }
        submitLabel="Create school"
        formAction={provisionAction}
        busy={provisionPending}
        dirty={provisionDialog.dirty}
        onDirtyChange={provisionDialog.setDirty}
        error={provisionState.error}
      >
        <input type="hidden" name="application_id" value={applicationId} />
        <DialogField
          id="provision-campus-name"
          name="campus_name"
          label="Default campus name"
          defaultValue="Main campus"
        />
      </FormDialog>

      {approveState.invitationToken ? (
        <FreshActivationLinkPanel
          token={approveState.invitationToken}
          applicantEmail={applicantEmail}
          schoolName={schoolName}
        />
      ) : null}

      {provisionState.invitationToken && !approveState.invitationToken ? (
        <FreshActivationLinkPanel
          token={provisionState.invitationToken}
          applicantEmail={applicantEmail}
          schoolName={schoolName}
        />
      ) : null}

      {showSharePanel && provisionedSchoolId && !freshToken ? (
        <ReissueActivationLinkPanel
          schoolId={provisionedSchoolId}
          schoolName={schoolName}
          applicantEmail={applicantEmail}
          invitationStatus={invitationStatus}
        />
      ) : null}

      {showSharePanel && freshToken ? (
        <p className="text-sm text-muted">
          After sharing the link, the school admin opens it, signs in with{" "}
          {applicantEmail}, and enters their school dashboard.{" "}
          <Link
            href="/platform/schools"
            className="text-ink underline-offset-2 hover:underline"
          >
            View schools
          </Link>
        </p>
      ) : null}
    </div>
  );
}
