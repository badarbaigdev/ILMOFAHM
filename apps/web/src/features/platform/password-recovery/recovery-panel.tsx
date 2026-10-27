"use client";

import { useActionState, useState } from "react";

import { DialogField, FormDialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  approveAndIssuePasswordRecoveryAction,
  denyPasswordRecoveryRequestAction,
  type PasswordRecoveryActionState,
} from "@/features/platform/password-recovery/actions";
import type { PasswordRecoveryRequestRow } from "@/features/platform/password-recovery/queries";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: PasswordRecoveryActionState = {
  error: null,
  success: null,
};

export function PasswordRecoveryPanel({
  requests,
}: {
  requests: PasswordRecoveryRequestRow[];
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveAndIssuePasswordRecoveryAction,
    initial,
  );
  const [denyState, denyAction, denyPending] = useActionState(
    denyPasswordRecoveryRequestAction,
    initial,
  );
  const approveDialog = useActionDialog(approveState);
  const denyDialog = useActionDialog(denyState);
  const [target, setTarget] = useState<PasswordRecoveryRequestRow | null>(null);

  return (
    <div>
      {(approveState.error || denyState.error) && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {approveState.error || denyState.error}
        </p>
      )}
      {(approveState.success || denyState.success) && (
        <p role="status" className="mb-3 text-sm text-teal">
          {approveState.success || denyState.success}
        </p>
      )}
      {approveState.recoveryUrl ? (
        <p className="mb-4 break-all rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Recovery link (share once via approved channel):{" "}
          {approveState.recoveryUrl}
        </p>
      ) : null}

      <SchoolDataTable
        rows={requests}
        rowKey={(row) => row.id}
        searchPlaceholder="Search recovery requests"
        searchText={(row) =>
          [
            row.schoolName,
            row.requesterEmail,
            row.requesterRole ?? "",
            row.reason,
            row.status,
          ].join(" ")
        }
        filterOptions={[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "fulfilled", label: "Fulfilled" },
          { value: "denied", label: "Denied" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        filterValue={(row) => row.status}
        emptyMessage="No password recovery requests yet."
        exportFileName="password-recovery-requests"
        selectable={false}
        columns={[
          {
            id: "school",
            header: "School",
            cell: (row) => (
              <a
                href={`/platform/schools/${row.schoolId}`}
                className="font-medium text-teal no-underline hover:underline"
              >
                {row.schoolName}
              </a>
            ),
          },
          {
            id: "requester",
            header: "Requester",
            cell: (row) => (
              <PersonCell
                name={row.requesterEmail}
                secondary={row.requesterRole ?? undefined}
              />
            ),
          },
          {
            id: "reason",
            header: "Reason",
            cell: (row) => (
              <span className="line-clamp-2 max-w-xs text-sm text-muted">
                {row.reason}
              </span>
            ),
          },
          {
            id: "requested",
            header: "Requested",
            cell: (row) => formatListDate(row.createdAt.slice(0, 10)),
          },
          {
            id: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            id: "action",
            header: "Action",
            cell: (row) => {
              if (
                row.status !== "pending" &&
                row.status !== "approved"
              ) {
                return <span className="text-muted">—</span>;
              }
              if (!row.requesterUserId) {
                return <span className="text-muted">Incomplete</span>;
              }
              return (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-sm text-teal underline-offset-2 hover:underline"
                    onClick={() => {
                      setTarget(row);
                      approveDialog.openDialog();
                    }}
                  >
                    {row.status === "pending"
                      ? "Approve & issue link"
                      : "Re-issue link"}
                  </button>
                  {row.status === "pending" ? (
                    <button
                      type="button"
                      className="text-sm text-red-700 underline-offset-2 hover:underline"
                      onClick={() => {
                        setTarget(row);
                        denyDialog.openDialog();
                      }}
                    >
                      Deny
                    </button>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />

      <FormDialog
        open={approveDialog.open && target !== null}
        onClose={() => {
          approveDialog.closeDialog();
          setTarget(null);
        }}
        title="Approve and issue recovery link"
        description={
          target
            ? `Verify ${target.requesterEmail} (${target.requesterRole}) for ${target.schoolName}, then generate a one-time reset link.`
            : undefined
        }
        submitLabel="Issue recovery link"
        formAction={approveAction}
        busy={approvePending}
        dirty={approveDialog.dirty}
        onDirtyChange={approveDialog.setDirty}
        error={approveState.error}
      >
        <input type="hidden" name="request_id" value={target?.id ?? ""} />
        <input type="hidden" name="school_id" value={target?.schoolId ?? ""} />
        <input
          type="hidden"
          name="user_id"
          value={target?.requesterUserId ?? ""}
        />
        <input
          type="hidden"
          name="email"
          value={target?.requesterEmail ?? ""}
        />
        <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-muted">
          Reason: {target?.reason}
        </p>
        <DialogField
          id="approve-note"
          name="review_note"
          label="Review note (optional)"
          placeholder="Identity verified by phone with school owner"
        />
      </FormDialog>

      <FormDialog
        open={denyDialog.open && target !== null}
        onClose={() => {
          denyDialog.closeDialog();
          setTarget(null);
        }}
        title="Deny recovery request"
        description={
          target
            ? `Deny the request from ${target.requesterEmail} for ${target.schoolName}?`
            : undefined
        }
        submitLabel="Deny request"
        formAction={denyAction}
        busy={denyPending}
        dirty={denyDialog.dirty}
        onDirtyChange={denyDialog.setDirty}
        error={denyState.error}
        tone="danger"
      >
        <input type="hidden" name="request_id" value={target?.id ?? ""} />
        <input type="hidden" name="school_id" value={target?.schoolId ?? ""} />
        <DialogField
          id="deny-note"
          name="review_note"
          label="Reason for denial"
          required
          placeholder="Could not verify identity"
        />
      </FormDialog>
    </div>
  );
}
