"use client";

import { useActionState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  assignSchoolSubscriptionAction,
  recordSubscriptionPaymentAction,
  setSubscriptionStatusAction,
  type SubscriptionActionState,
  voidSubscriptionPaymentAction,
} from "@/features/platform/subscriptions/actions";
import type {
  SubscriptionPaymentRow,
  SubscriptionPlanRow,
} from "@/features/platform/subscriptions/queries";
import {
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: SubscriptionActionState = { error: null, success: null };

export function AssignSubscriptionForm({
  schools,
  plans,
}: {
  schools: Array<{ id: string; name: string }>;
  plans: SubscriptionPlanRow[];
}) {
  const [state, action, pending] = useActionState(
    assignSchoolSubscriptionAction,
    initial,
  );
  const dialog = useActionDialog(state);

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
      >
        + Assign subscription
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Assign or replace subscription"
        description="Creates a new current subscription and marks any previous current row as historical."
        submitLabel="Assign subscription"
        formAction={action}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <DialogSelect
          id="school_id"
          name="school_id"
          label="School"
          required
          disabled={schools.length === 0}
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
        />
        <DialogSelect
          id="plan_id"
          name="plan_id"
          label="Plan"
          required
          options={plans
            .filter((p) => p.isActive)
            .map((p) => ({ value: p.id, label: p.name }))}
        />
        <DialogSelect
          id="status"
          name="status"
          label="Status"
          required
          defaultValue="active"
          options={[
            { value: "trial", label: "Trial" },
            { value: "active", label: "Active" },
            { value: "past_due", label: "Past due" },
            { value: "grace", label: "Grace" },
            { value: "suspended", label: "Suspended" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <DialogField
          id="billing_contact_name"
          name="billing_contact_name"
          label="Billing contact name"
        />
        <DialogField
          id="billing_contact_email"
          name="billing_contact_email"
          label="Billing contact email"
          type="email"
        />
        <DialogField id="notes" name="notes" label="Notes" />
      </FormDialog>
    </>
  );
}

export function SetSubscriptionStatusForm({
  subscriptionId,
  currentStatus,
}: {
  subscriptionId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState(
    setSubscriptionStatusAction,
    initial,
  );
  const dialog = useActionDialog(state);

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
      >
        Update status
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Update subscription status"
        description={`Current status: ${currentStatus.replaceAll("_", " ")}.`}
        submitLabel="Save status"
        formAction={action}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <DialogSelect
          id="status"
          name="status"
          label="Status"
          required
          defaultValue={currentStatus}
          options={[
            { value: "trial", label: "Trial" },
            { value: "active", label: "Active" },
            { value: "past_due", label: "Past due" },
            { value: "grace", label: "Grace" },
            { value: "suspended", label: "Suspended" },
            { value: "cancelled", label: "Cancelled" },
            { value: "expired", label: "Expired" },
          ]}
        />
        <DialogField id="notes" name="notes" label="Notes" />
      </FormDialog>
    </>
  );
}

export function RecordPaymentForm({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const [state, action, pending] = useActionState(
    recordSubscriptionPaymentAction,
    initial,
  );
  const dialog = useActionDialog(state);

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
      >
        + Record payment
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Record manual payment"
        description="Record bank/cash/cheque receipts. No online gateway."
        submitLabel="Record payment"
        formAction={action}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <DialogField id="amount" name="amount" label="Amount" required />
        <DialogField
          id="currency_code"
          name="currency_code"
          label="Currency"
          defaultValue="PKR"
        />
        <DialogSelect
          id="method"
          name="method"
          label="Method"
          required
          defaultValue="bank_transfer"
          options={[
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "cash", label: "Cash" },
            { value: "cheque", label: "Cheque" },
            { value: "other", label: "Other" },
          ]}
        />
        <DialogField id="reference" name="reference" label="Reference" />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="period_start"
            name="period_start"
            label="Period start"
            type="date"
          />
          <DialogField
            id="period_end"
            name="period_end"
            label="Period end"
            type="date"
          />
        </div>
        <DialogField
          id="idempotency_key"
          name="idempotency_key"
          label="Idempotency key"
        />
        <DialogField id="notes" name="notes" label="Notes" />
        <label className="inline-flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="confirm" defaultChecked />
          Mark as confirmed
        </label>
      </FormDialog>
    </>
  );
}

export function VoidPaymentForm({
  payment,
  subscriptionId,
}: {
  payment: SubscriptionPaymentRow;
  subscriptionId: string;
}) {
  const [state, action, pending] = useActionState(
    voidSubscriptionPaymentAction,
    initial,
  );
  const dialog = useActionDialog(state);

  if (payment.status === "voided") {
    return (
      <span className="text-xs text-muted">
        Voided{payment.voidReason ? `: ${payment.voidReason}` : ""}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={dialog.openDialog}
        className="text-sm text-red-700 underline-offset-2 hover:underline"
      >
        Void
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Void payment"
        description={`Void ${payment.amount.toFixed(2)} ${payment.currencyCode}? This cannot be undone.`}
        submitLabel="Void payment"
        formAction={action}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
        tone="danger"
      >
        <input type="hidden" name="payment_id" value={payment.id} />
        <input type="hidden" name="subscription_id" value={subscriptionId} />
        <DialogField
          id={`void-reason-${payment.id}`}
          name="void_reason"
          label="Void reason"
          required
        />
      </FormDialog>
    </>
  );
}

export function SubscriptionPaymentsTable({
  payments,
  subscriptionId,
}: {
  payments: SubscriptionPaymentRow[];
  subscriptionId: string;
}) {
  return (
    <SchoolDataTable
      rows={payments}
      rowKey={(row) => row.id}
      searchPlaceholder="Search payments"
      searchText={(row) =>
        [
          row.amount,
          row.currencyCode,
          row.method,
          row.reference ?? "",
          row.status,
        ].join(" ")
      }
      emptyMessage="No payments recorded yet."
      exportFileName="subscription-payments"
      selectable={false}
      columns={[
        {
          id: "amount",
          header: "Amount",
          cell: (row) => (
            <span className="font-medium text-ink">
              {row.amount.toFixed(2)} {row.currencyCode}
            </span>
          ),
        },
        {
          id: "method",
          header: "Method",
          cell: (row) => (
            <span className="capitalize">
              {row.method.replaceAll("_", " ")}
            </span>
          ),
        },
        {
          id: "reference",
          header: "Reference",
          cell: (row) => row.reference ?? "—",
        },
        {
          id: "paid",
          header: "Paid on",
          cell: (row) => formatListDate(row.paidAt.slice(0, 10)),
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
            <VoidPaymentForm payment={row} subscriptionId={subscriptionId} />
          ),
        },
      ]}
    />
  );
}
