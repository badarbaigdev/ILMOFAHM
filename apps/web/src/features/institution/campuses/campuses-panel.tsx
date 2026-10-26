"use client";

import { useActionState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type CampusActionState,
  createCampusAction,
  updateCampusAction,
} from "@/features/institution/campuses/actions";
import type { CampusRow } from "@/features/institution/campuses/queries";
import { StatusBadge } from "@/features/schools/ui/data-table";

const initialState: CampusActionState = { error: null, success: null };

type CampusesPanelProps = {
  organizationId: string;
  campuses: CampusRow[];
  canManage: boolean;
};

function CreateCampusForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(
    createCampusAction,
    initialState,
  );
  const dialog = useActionDialog(state);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
      >
        + Add campus
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Add campus"
        description="Create a branch for this organization."
        submitLabel="Create campus"
        formAction={formAction}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <input type="hidden" name="organization_id" value={organizationId} />
        <DialogField id="new-campus-name" name="name" label="Name" required />
        <DialogField id="new-campus-code" name="code" label="Code (optional)" />
        <DialogField
          id="new-campus-phone"
          name="phone"
          label="Phone (optional)"
          type="tel"
        />
        <DialogField
          id="new-campus-email"
          name="email"
          label="Email (optional)"
          type="email"
        />
        <DialogField
          id="new-campus-address"
          name="address_line"
          label="Address (optional)"
        />
      </FormDialog>
    </div>
  );
}

function CampusRowItem({
  organizationId,
  campus,
  canManage,
}: {
  organizationId: string;
  campus: CampusRow;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateCampusAction,
    initialState,
  );
  const dialog = useActionDialog(state);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4 first:border-t-0 first:pt-0">
      <div>
        <p className="font-medium text-ink">{campus.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {[campus.code, campus.phone, campus.email].filter(Boolean).join(" · ") ||
            "No contact details"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={campus.status} />
        {canManage ? (
          <button
            type="button"
            onClick={dialog.openDialog}
            className="text-sm text-teal underline-offset-2 hover:underline"
          >
            Edit
          </button>
        ) : null}
      </div>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title={`Edit ${campus.name}`}
        description="Update campus details or archive this branch."
        submitLabel="Save campus"
        formAction={formAction}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <input type="hidden" name="organization_id" value={organizationId} />
        <input type="hidden" name="campus_id" value={campus.id} />
        <DialogField
          id={`campus-name-${campus.id}`}
          name="name"
          label="Name"
          required
          defaultValue={campus.name}
        />
        <DialogField
          id={`campus-code-${campus.id}`}
          name="code"
          label="Code"
          defaultValue={campus.code ?? ""}
        />
        <DialogField
          id={`campus-phone-${campus.id}`}
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={campus.phone ?? ""}
        />
        <DialogField
          id={`campus-email-${campus.id}`}
          name="email"
          label="Email"
          type="email"
          defaultValue={campus.email ?? ""}
        />
        <DialogField
          id={`campus-address-${campus.id}`}
          name="address_line"
          label="Address"
          defaultValue={campus.addressLine ?? ""}
        />
        <DialogSelect
          id={`campus-status-${campus.id}`}
          name="status"
          label="Status"
          required
          defaultValue={campus.status}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
      </FormDialog>
    </li>
  );
}

export function CampusesPanel({
  organizationId,
  campuses,
  canManage,
}: CampusesPanelProps) {
  return (
    <section aria-labelledby="campuses-heading" className="mt-14">
      <h2
        id="campuses-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Campuses
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Branches for this organization. Archived campuses stay in history but
        cannot be selected for new campus-scoped actions.
      </p>

      {campuses.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted">
          No campuses yet.
        </p>
      ) : (
        <ul className="mt-6 rounded-xl border border-line bg-paper-elevated px-4">
          {campuses.map((campus) => (
            <CampusRowItem
              key={campus.id}
              organizationId={organizationId}
              campus={campus}
              canManage={canManage}
            />
          ))}
        </ul>
      )}

      {canManage ? <CreateCampusForm organizationId={organizationId} /> : null}
      {!canManage ? (
        <p role="status" className="mt-6 text-sm text-muted">
          Only owners and admins can add or edit campuses.
        </p>
      ) : null}
    </section>
  );
}
