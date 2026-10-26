"use client";

import { useActionState, useEffect, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { pushToast } from "@/components/ui/toast";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  createSchoolInvitationAction,
  revokeSchoolInvitationAction,
  setSchoolMembershipRoleAction,
  setSchoolMembershipStatusAction,
  type SchoolMembershipActionState,
} from "@/features/schools/members/actions";
import type {
  SchoolMemberRow,
  SchoolPendingInviteRow,
} from "@/features/schools/members/queries";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initialState: SchoolMembershipActionState = {
  error: null,
  success: null,
  inviteUrl: null,
};

export function SchoolMembersPanel({
  schoolId,
  schoolName,
  canInvite,
  canManageStatus,
  canManageRole,
  currentUserId,
  members,
  invitations,
}: {
  schoolId: string;
  schoolName: string;
  canInvite: boolean;
  canManageStatus: boolean;
  canManageRole: boolean;
  currentUserId: string;
  members: SchoolMemberRow[];
  invitations: SchoolPendingInviteRow[];
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    createSchoolInvitationAction,
    initialState,
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteDirty, setInviteDirty] = useState(false);
  const [seenInviteSuccess, setSeenInviteSuccess] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!inviteState.success || inviteState.success === seenInviteSuccess) {
      return;
    }
    setSeenInviteSuccess(inviteState.success);
    setInviteDirty(false);
    if (inviteState.inviteUrl) {
      pushToast("Invitation created — copy the link below.", "success");
    } else {
      setInviteOpen(false);
      pushToast(inviteState.success, "success");
    }
  }, [inviteState.success, inviteState.inviteUrl, seenInviteSuccess]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Invitations for {schoolName} are time-bound and single-use. Owner
          membership comes from platform provisioning; staff roles are invited
          here. Suspended or revoked members lose access on the next request.
        </p>
        {canInvite ? (
          <button
            type="button"
            onClick={() => {
              setInviteDirty(false);
              setInviteOpen(true);
            }}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            + Invite member
          </button>
        ) : null}
      </div>

      <section aria-labelledby="members-heading" className="mt-10">
        <h2
          id="members-heading"
          className="mb-4 text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Current members
        </h2>
        <SchoolDataTable
          rows={members}
          rowKey={(row) => row.id}
          searchPlaceholder="Search members"
          searchText={(row) =>
            [row.fullName ?? "", row.role, row.status].join(" ")
          }
          filterOptions={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "revoked", label: "Revoked" },
          ]}
          filterValue={(row) => row.status}
          emptyMessage="No members yet."
          exportFileName="school-members"
          columns={[
            {
              id: "name",
              header: "Name",
              cell: (row) => {
                const isSelf = row.userId === currentUserId;
                return (
                  <PersonCell
                    name={`${row.fullName ?? "Member"}${isSelf ? " (you)" : ""}`}
                    secondary={row.role}
                  />
                );
              },
            },
            {
              id: "role",
              header: "Role",
              cell: (row) => <span className="capitalize">{row.role}</span>,
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => <StatusBadge status={row.status} />,
            },
            {
              id: "action",
              header: "Action",
              cell: (row) => (
                <MemberActions
                  member={row}
                  schoolId={schoolId}
                  currentUserId={currentUserId}
                  canManageRole={canManageRole}
                  canManageStatus={canManageStatus}
                />
              ),
            },
          ]}
        />
      </section>

      <section aria-labelledby="invites-heading" className="mt-12">
        <h2
          id="invites-heading"
          className="mb-4 text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Pending invitations
        </h2>
        <SchoolDataTable
          rows={invitations}
          rowKey={(row) => row.id}
          searchPlaceholder="Search invitations"
          searchText={(row) => [row.email, row.role].join(" ")}
          emptyMessage="No pending invitations."
          exportFileName="school-invitations"
          selectable={false}
          columns={[
            {
              id: "email",
              header: "Email",
              cell: (row) => (
                <span className="font-medium text-teal">{row.email}</span>
              ),
            },
            {
              id: "role",
              header: "Role",
              cell: (row) => <span className="capitalize">{row.role}</span>,
            },
            {
              id: "expires",
              header: "Expires",
              cell: (row) => formatListDate(row.expiresAt.slice(0, 10)),
            },
            {
              id: "action",
              header: "Action",
              cell: (row) =>
                canInvite ? (
                  <RevokeInviteButton
                    invitationId={row.id}
                    schoolId={schoolId}
                    email={row.email}
                  />
                ) : (
                  <span className="text-muted">—</span>
                ),
            },
          ]}
        />
      </section>

      <FormDialog
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteDirty(false);
        }}
        title="Invite member"
        description={`Send a single-use invitation for ${schoolName}.`}
        submitLabel="Create invitation"
        formAction={inviteAction}
        busy={invitePending}
        dirty={inviteDirty && !inviteState.inviteUrl}
        onDirtyChange={setInviteDirty}
        error={inviteState.error}
        success={inviteState.success}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="invite-email"
          name="email"
          label="Email"
          type="email"
          required
        />
        <DialogSelect
          id="invite-role"
          name="role"
          label="Role"
          required
          defaultValue="teacher"
          options={[
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "accountant", label: "Accountant" },
            { value: "staff", label: "Staff" },
          ]}
        />
        {inviteState.inviteUrl ? (
          <p className="break-all rounded-md border border-line bg-paper p-3 font-mono text-xs text-ink-soft">
            {inviteState.inviteUrl}
          </p>
        ) : null}
      </FormDialog>
    </div>
  );
}

function MemberActions({
  member,
  schoolId,
  currentUserId,
  canManageRole,
  canManageStatus,
}: {
  member: SchoolMemberRow;
  schoolId: string;
  currentUserId: string;
  canManageRole: boolean;
  canManageStatus: boolean;
}) {
  const isSelf = member.userId === currentUserId;
  const isOwner = member.role === "owner";
  const showRole = canManageRole && !isOwner && !isSelf;
  const showStatus = canManageStatus && !isSelf;

  const [roleState, roleAction, rolePending] = useActionState(
    setSchoolMembershipRoleAction,
    initialState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setSchoolMembershipStatusAction,
    initialState,
  );
  const roleDialog = useActionDialog(roleState);
  const statusDialog = useActionDialog(statusState);
  const [nextStatus, setNextStatus] = useState<
    "active" | "suspended" | "revoked" | null
  >(null);

  if (!showRole && !showStatus) {
    return <span className="text-muted">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {showRole ? (
        <button
          type="button"
          onClick={roleDialog.openDialog}
          className="text-ink-soft underline-offset-2 hover:underline"
        >
          Edit role
        </button>
      ) : null}
      {showStatus && member.status !== "active" ? (
        <button
          type="button"
          onClick={() => {
            setNextStatus("active");
            statusDialog.openDialog();
          }}
          className="text-ink-soft underline-offset-2 hover:underline"
        >
          Activate
        </button>
      ) : null}
      {showStatus && member.status === "active" ? (
        <button
          type="button"
          onClick={() => {
            setNextStatus("suspended");
            statusDialog.openDialog();
          }}
          className="text-ink-soft underline-offset-2 hover:underline"
        >
          Suspend
        </button>
      ) : null}
      {showStatus && member.status !== "revoked" ? (
        <button
          type="button"
          onClick={() => {
            setNextStatus("revoked");
            statusDialog.openDialog();
          }}
          className="text-red-700 underline-offset-2 hover:underline"
        >
          Revoke
        </button>
      ) : null}

      <FormDialog
        open={roleDialog.open}
        onClose={roleDialog.closeDialog}
        title="Edit member role"
        description={`Update the role for ${member.fullName ?? "this member"}.`}
        submitLabel="Save role"
        formAction={roleAction}
        busy={rolePending}
        dirty={roleDialog.dirty}
        onDirtyChange={roleDialog.setDirty}
        error={roleState.error}
      >
        <input type="hidden" name="membership_id" value={member.id} />
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogSelect
          id={`role-${member.id}`}
          name="role"
          label="Role"
          required
          defaultValue={member.role}
          options={[
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "accountant", label: "Accountant" },
            { value: "staff", label: "Staff" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={statusDialog.open && nextStatus !== null}
        onClose={() => {
          statusDialog.closeDialog();
          setNextStatus(null);
        }}
        title={
          nextStatus === "active"
            ? "Activate member"
            : nextStatus === "suspended"
              ? "Suspend member"
              : "Revoke member"
        }
        description={
          nextStatus === "active"
            ? `Restore access for ${member.fullName ?? "this member"}?`
            : nextStatus === "suspended"
              ? `Suspend ${member.fullName ?? "this member"}? They will lose access on the next request.`
              : `Revoke ${member.fullName ?? "this member"} permanently from this school?`
        }
        submitLabel={
          nextStatus === "active"
            ? "Activate"
            : nextStatus === "suspended"
              ? "Suspend"
              : "Revoke"
        }
        formAction={statusAction}
        busy={statusPending}
        error={statusState.error}
        tone={nextStatus === "active" ? "default" : "danger"}
      >
        <input type="hidden" name="membership_id" value={member.id} />
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="status" value={nextStatus ?? ""} />
      </FormDialog>
    </div>
  );
}

function RevokeInviteButton({
  invitationId,
  schoolId,
  email,
}: {
  invitationId: string;
  schoolId: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    revokeSchoolInvitationAction,
    initialState,
  );
  const dialog = useActionDialog(state);

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="text-red-700 underline-offset-2 hover:underline"
      >
        Revoke
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Revoke invitation"
        description={`Cancel the pending invitation for ${email}? They will no longer be able to accept this link.`}
        submitLabel="Revoke invitation"
        formAction={formAction}
        busy={pending}
        error={state.error}
        tone="danger"
      >
        <input type="hidden" name="invitation_id" value={invitationId} />
        <input type="hidden" name="school_id" value={schoolId} />
      </FormDialog>
    </>
  );
}
