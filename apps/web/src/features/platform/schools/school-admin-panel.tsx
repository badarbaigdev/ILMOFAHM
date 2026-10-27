"use client";

import { useActionState, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type PlatformSchoolAdminActionState,
  endSchoolSupportSessionAction,
  platformInviteSchoolAdminAction,
  platformResetMemberPasswordAction,
  platformResetMemberProfileAction,
  platformRevokeInvitationAction,
  platformSetMembershipRoleAction,
  platformSetMembershipStatusAction,
  startSchoolSupportSessionAction,
} from "@/features/platform/schools/actions";
import type { SchoolSupportSessionRow } from "@/features/platform/schools/support";
import type {
  SchoolMemberRow,
  SchoolPendingInviteRow,
} from "@/features/schools/members/queries";
import {
  PersonCell,
  RowActionsMenu,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: PlatformSchoolAdminActionState = {
  error: null,
  success: null,
};

type MemberWithEmail = SchoolMemberRow & { email: string | null };

export function PlatformSchoolAdminPanel({
  schoolId,
  schoolName,
  members,
  invitations,
  activeSupport,
}: {
  schoolId: string;
  schoolName: string;
  members: MemberWithEmail[];
  invitations: SchoolPendingInviteRow[];
  activeSupport: SchoolSupportSessionRow | null;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    platformInviteSchoolAdminAction,
    initial,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    platformSetMembershipStatusAction,
    initial,
  );
  const [roleState, roleAction, rolePending] = useActionState(
    platformSetMembershipRoleAction,
    initial,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    platformRevokeInvitationAction,
    initial,
  );
  const [profileState, profileAction, profilePending] = useActionState(
    platformResetMemberProfileAction,
    initial,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    platformResetMemberPasswordAction,
    initial,
  );
  const [supportState, supportAction, supportPending] = useActionState(
    startSchoolSupportSessionAction,
    initial,
  );
  const [endSupportState, endSupportAction, endSupportPending] = useActionState(
    endSchoolSupportSessionAction,
    initial,
  );

  const inviteDialog = useActionDialog(inviteState);
  const supportDialog = useActionDialog(supportState);
  const profileDialog = useActionDialog(profileState);
  const passwordDialog = useActionDialog(passwordState);
  const roleDialog = useActionDialog(roleState);
  const statusDialog = useActionDialog(statusState);

  const [targetMember, setTargetMember] = useState<MemberWithEmail | null>(
    null,
  );
  const [statusTarget, setStatusTarget] = useState<{
    member: MemberWithEmail;
    status: string;
  } | null>(null);

  const feedback =
    inviteState.success ||
    statusState.success ||
    roleState.success ||
    revokeState.success ||
    profileState.success ||
    passwordState.success ||
    supportState.success ||
    endSupportState.success;
  const feedbackError =
    inviteState.error ||
    statusState.error ||
    roleState.error ||
    revokeState.error ||
    profileState.error ||
    passwordState.error ||
    supportState.error ||
    endSupportState.error;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-paper-elevated p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
              Login to school as superadmin
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Opens a time-limited support session so you can review{" "}
              {schoolName} in the school console. Access is audited and must
              include a reason (ILM-PLT-011).
            </p>
            {activeSupport ? (
              <p className="mt-2 text-sm text-teal">
                Active until{" "}
                {new Date(activeSupport.expiresAt).toLocaleString()} ·{" "}
                {activeSupport.reason}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSupport ? (
              <>
                <a
                  href={`/school?school=${schoolId}`}
                  className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white no-underline"
                >
                  Open school console
                </a>
                <form action={endSupportAction}>
                  <input type="hidden" name="school_id" value={schoolId} />
                  <button
                    type="submit"
                    disabled={endSupportPending}
                    className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                  >
                    {endSupportPending ? "Ending…" : "End session"}
                  </button>
                </form>
              </>
            ) : (
              <button
                type="button"
                onClick={supportDialog.openDialog}
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
              >
                Start support access
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
              School admins & staff
            </h2>
            <p className="mt-1 text-sm text-muted">
              Invite admins, change roles/status, and reset profiles or
              passwords.
            </p>
          </div>
          <button
            type="button"
            onClick={inviteDialog.openDialog}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated"
          >
            + Invite member
          </button>
        </div>

        {feedbackError ? (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {feedbackError}
          </p>
        ) : null}
        {feedback ? (
          <p role="status" className="mb-3 text-sm text-teal">
            {feedback}
          </p>
        ) : null}
        {inviteState.inviteUrl ? (
          <p className="mb-3 break-all rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink">
            Invite link: {inviteState.inviteUrl}
          </p>
        ) : null}
        {passwordState.recoveryUrl ? (
          <p className="mb-3 break-all rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Password reset link (share once): {passwordState.recoveryUrl}
          </p>
        ) : null}

        <SchoolDataTable
          rows={members}
          rowKey={(row) => row.id}
          searchPlaceholder="Search members"
          searchText={(row) =>
            [row.fullName ?? "", row.email ?? "", row.role, row.status].join(
              " ",
            )
          }
          filterOptions={[
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "revoked", label: "Revoked" },
            { value: "invited", label: "Invited" },
          ]}
          filterValue={(row) => row.status}
          emptyMessage="No members yet."
          exportFileName={`${schoolName}-members`}
          selectable={false}
          columns={[
            {
              id: "person",
              header: "Member",
              cell: (row) => (
                <PersonCell
                  name={row.fullName || row.email || "Member"}
                  secondary={row.email}
                />
              ),
            },
            {
              id: "role",
              header: "Role",
              cell: (row) => (
                <span className="capitalize">{row.role}</span>
              ),
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
                <RowActionsMenu>
                  {row.role !== "owner" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setTargetMember(row);
                        roleDialog.openDialog();
                      }}
                    >
                      Change role
                    </button>
                  ) : null}
                  {row.status === "active" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setStatusTarget({ member: row, status: "suspended" });
                        statusDialog.openDialog();
                      }}
                    >
                      Suspend
                    </button>
                  ) : null}
                  {row.status === "suspended" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setStatusTarget({ member: row, status: "active" });
                        statusDialog.openDialog();
                      }}
                    >
                      Reactivate
                    </button>
                  ) : null}
                  {row.status !== "revoked" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      onClick={() => {
                        setStatusTarget({ member: row, status: "revoked" });
                        statusDialog.openDialog();
                      }}
                    >
                      Revoke access
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                    onClick={() => {
                      setTargetMember(row);
                      profileDialog.openDialog();
                    }}
                  >
                    Edit profile name
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                    onClick={() => {
                      setTargetMember(row);
                      passwordDialog.openDialog();
                    }}
                  >
                    Reset password link
                  </button>
                </RowActionsMenu>
              ),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Pending invitations
        </h2>
        {invitations.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No pending invitations.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/70 rounded-2xl border border-line bg-paper-elevated">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{invite.email}</p>
                  <p className="text-xs text-muted">
                    {invite.role} · expires{" "}
                    {formatListDate(invite.expiresAt.slice(0, 10))}
                  </p>
                </div>
                <form action={revokeAction}>
                  <input type="hidden" name="school_id" value={schoolId} />
                  <input
                    type="hidden"
                    name="invitation_id"
                    value={invite.id}
                  />
                  <button
                    type="submit"
                    disabled={revokePending}
                    className="text-sm text-red-700 underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormDialog
        open={inviteDialog.open}
        onClose={inviteDialog.closeDialog}
        title="Invite school member"
        description={`Send a time-bound invite to join ${schoolName}.`}
        submitLabel="Create invitation"
        formAction={inviteAction}
        busy={invitePending}
        dirty={inviteDialog.dirty}
        onDirtyChange={inviteDialog.setDirty}
        error={inviteState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="platform-invite-email"
          name="email"
          label="Email"
          type="email"
          required
        />
        <DialogSelect
          id="platform-invite-role"
          name="role"
          label="Role"
          required
          defaultValue="admin"
          options={[
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "accountant", label: "Accountant" },
            { value: "staff", label: "Staff" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={supportDialog.open}
        onClose={supportDialog.closeDialog}
        title="Start support access"
        description={`You will enter ${schoolName} as a platform operator. Provide a business reason.`}
        submitLabel="Start & open school"
        formAction={supportAction}
        busy={supportPending}
        dirty={supportDialog.dirty}
        onDirtyChange={supportDialog.setDirty}
        error={supportState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="support-reason"
          name="reason"
          label="Reason"
          required
          placeholder="e.g. Investigate failed fee reconciliation for campus A"
        />
        <DialogSelect
          id="support-hours"
          name="duration_hours"
          label="Duration"
          required
          defaultValue="4"
          options={[
            { value: "1", label: "1 hour" },
            { value: "4", label: "4 hours" },
            { value: "8", label: "8 hours" },
            { value: "24", label: "24 hours" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={profileDialog.open && targetMember !== null}
        onClose={() => {
          profileDialog.closeDialog();
          setTargetMember(null);
        }}
        title="Edit profile name"
        description="Updates the member’s display name on their profile."
        submitLabel="Save name"
        formAction={profileAction}
        busy={profilePending}
        dirty={profileDialog.dirty}
        onDirtyChange={profileDialog.setDirty}
        error={profileState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="user_id"
          value={targetMember?.userId ?? ""}
        />
        <DialogField
          id="profile-full-name"
          name="full_name"
          label="Display name"
          required
          defaultValue={targetMember?.fullName ?? ""}
        />
      </FormDialog>

      <FormDialog
        open={passwordDialog.open && targetMember !== null}
        onClose={() => {
          passwordDialog.closeDialog();
          setTargetMember(null);
        }}
        title="Reset password"
        description="Creates a one-time recovery link. Share it securely with the member — the platform never sees their password."
        submitLabel="Generate reset link"
        formAction={passwordAction}
        busy={passwordPending}
        error={passwordState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="user_id"
          value={targetMember?.userId ?? ""}
        />
        <p className="text-sm text-muted">
          Member: {targetMember?.fullName || targetMember?.email || "—"}
        </p>
      </FormDialog>

      <FormDialog
        open={roleDialog.open && targetMember !== null}
        onClose={() => {
          roleDialog.closeDialog();
          setTargetMember(null);
        }}
        title="Change role"
        description="Owner role cannot be changed here."
        submitLabel="Save role"
        formAction={roleAction}
        busy={rolePending}
        dirty={roleDialog.dirty}
        onDirtyChange={roleDialog.setDirty}
        error={roleState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="membership_id"
          value={targetMember?.id ?? ""}
        />
        <DialogSelect
          id="member-role"
          name="role"
          label="Role"
          required
          defaultValue={
            targetMember?.role === "owner" ? "admin" : (targetMember?.role ?? "admin")
          }
          options={[
            { value: "admin", label: "Admin" },
            { value: "teacher", label: "Teacher" },
            { value: "accountant", label: "Accountant" },
            { value: "staff", label: "Staff" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={statusDialog.open && statusTarget !== null}
        onClose={() => {
          statusDialog.closeDialog();
          setStatusTarget(null);
        }}
        title={
          statusTarget?.status === "active"
            ? "Reactivate member"
            : statusTarget?.status === "suspended"
              ? "Suspend member"
              : "Revoke access"
        }
        description={
          statusTarget
            ? `Set ${statusTarget.member.fullName || statusTarget.member.email || "member"} to ${statusTarget.status}.`
            : undefined
        }
        submitLabel="Confirm"
        formAction={statusAction}
        busy={statusPending}
        error={statusState.error}
        tone={statusTarget?.status === "revoked" ? "danger" : "default"}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="membership_id"
          value={statusTarget?.member.id ?? ""}
        />
        <input
          type="hidden"
          name="status"
          value={statusTarget?.status ?? ""}
        />
      </FormDialog>
    </div>
  );
}
