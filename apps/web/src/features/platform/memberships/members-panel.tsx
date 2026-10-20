"use client";

import { useActionState } from "react";

import {
  type MembershipActionState,
  createInvitationAction,
  revokeInvitationAction,
  setMembershipStatusAction,
} from "@/features/platform/memberships/actions";
import type {
  OrgMemberRow,
  PendingInvitationRow,
} from "@/features/platform/memberships/queries";

const initialState: MembershipActionState = {
  error: null,
  success: null,
  inviteUrl: null,
};

function InviteForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(
    createInvitationAction,
    initialState,
  );

  return (
    <section aria-labelledby="invite-heading" className="mt-10">
      <h2
        id="invite-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Invite member
      </h2>
      <form action={formAction} className="mt-4 space-y-3" noValidate>
        <input type="hidden" name="organization_id" value={organizationId} />
        <div className="space-y-1.5">
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full max-w-md rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="invite-role"
            className="block text-sm font-medium text-ink"
          >
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="teacher"
            className="w-full max-w-md rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="teacher">Teacher</option>
            <option value="finance">Finance</option>
            <option value="guardian">Guardian</option>
          </select>
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-teal">
            {state.success}
          </p>
        ) : null}
        {state.inviteUrl ? (
          <p className="break-all rounded-md border border-line bg-paper-elevated p-3 font-mono text-xs text-ink-soft">
            {state.inviteUrl}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create invitation"}
        </button>
      </form>
    </section>
  );
}

function StatusForm({
  membershipId,
  organizationId,
  nextStatus,
  label,
}: {
  membershipId: string;
  organizationId: string;
  nextStatus: "active" | "suspended" | "revoked";
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    setMembershipStatusAction,
    initialState,
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="membership_id" value={membershipId} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="status" value={nextStatus} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-ink-soft underline-offset-2 hover:underline disabled:opacity-60"
      >
        {pending ? "…" : label}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-red-700">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function RevokeInviteForm({
  invitationId,
  organizationId,
}: {
  invitationId: string;
  organizationId: string;
}) {
  const [, formAction, pending] = useActionState(
    revokeInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="invitation_id" value={invitationId} />
      <input type="hidden" name="organization_id" value={organizationId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-ink-soft underline-offset-2 hover:underline disabled:opacity-60"
      >
        {pending ? "…" : "Revoke"}
      </button>
    </form>
  );
}

export function MembersPanel({
  organizationId,
  organizationName,
  isManager,
  currentUserId,
  members,
  invitations,
}: {
  organizationId: string;
  organizationName: string;
  isManager: boolean;
  currentUserId: string;
  members: OrgMemberRow[];
  invitations: PendingInvitationRow[];
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-10">
      <h1 className="font-display text-4xl tracking-tight text-ink">Members</h1>
      <p className="mt-3 max-w-2xl text-muted">
        {organizationName}. Invitations are time-bound and single-use. Suspended
        or revoked members lose access on the next authorized request.
      </p>

      <section aria-labelledby="members-heading" className="mt-10">
        <h2
          id="members-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Current members
        </h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-medium text-ink">
                  {member.fullName ?? "Member"}
                </p>
                <p className="text-sm text-muted">
                  {member.role} · {member.status}
                </p>
              </div>
              {isManager && member.userId !== currentUserId ? (
                <div className="flex flex-wrap gap-3">
                  {member.status !== "active" ? (
                    <StatusForm
                      membershipId={member.id}
                      organizationId={organizationId}
                      nextStatus="active"
                      label="Reactivate"
                    />
                  ) : null}
                  {member.status === "active" ? (
                    <StatusForm
                      membershipId={member.id}
                      organizationId={organizationId}
                      nextStatus="suspended"
                      label="Suspend"
                    />
                  ) : null}
                  {member.status !== "revoked" ? (
                    <StatusForm
                      membershipId={member.id}
                      organizationId={organizationId}
                      nextStatus="revoked"
                      label="Revoke"
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {isManager ? (
        <>
          <section aria-labelledby="pending-heading" className="mt-10">
            <h2
              id="pending-heading"
              className="text-sm font-semibold tracking-wide text-ink uppercase"
            >
              Pending invitations
            </h2>
            {invitations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No pending invitations.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {invitations.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">{invite.email}</p>
                      <p className="text-sm text-muted">
                        {invite.role} · expires{" "}
                        {new Date(invite.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <RevokeInviteForm
                      invitationId={invite.id}
                      organizationId={organizationId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <InviteForm organizationId={organizationId} />
        </>
      ) : (
        <p className="mt-10 text-sm text-muted">
          Only owners and admins can invite members or change membership status.
        </p>
      )}
    </div>
  );
}
