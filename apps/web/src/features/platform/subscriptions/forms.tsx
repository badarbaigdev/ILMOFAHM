"use client";

import { useActionState } from "react";

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

const initial: SubscriptionActionState = { error: null, success: null };

function Feedback({ state }: { state: SubscriptionActionState }) {
  return (
    <>
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
    </>
  );
}

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

  return (
    <form action={action} className="mt-6 max-w-lg space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="school_id" className="block text-sm font-medium text-ink">
          School
        </label>
        <select
          id="school_id"
          name="school_id"
          required
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          <option value="">Select school</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="plan_id" className="block text-sm font-medium text-ink">
          Plan
        </label>
        <select
          id="plan_id"
          name="plan_id"
          required
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          {plans
            .filter((p) => p.isActive)
            .map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue="active"
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="grace">Grace</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <Field label="Billing contact name" name="billing_contact_name" />
      <Field
        label="Billing contact email"
        name="billing_contact_email"
        type="email"
      />
      <Field label="Notes" name="notes" />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending || schools.length === 0}
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
      >
        {pending ? "Assigning…" : "Assign subscription"}
      </button>
    </form>
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

  return (
    <form action={action} className="mt-4 max-w-md space-y-3" noValidate>
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <div className="space-y-1.5">
        <label htmlFor="status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="grace">Grace</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <Field label="Notes" name="notes" />
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update status"}
      </button>
    </form>
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

  return (
    <form action={action} className="mt-4 max-w-lg space-y-3" noValidate>
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <Field label="Amount" name="amount" required />
      <Field label="Currency" name="currency_code" defaultValue="PKR" />
      <div className="space-y-1.5">
        <label htmlFor="method" className="block text-sm font-medium text-ink">
          Method
        </label>
        <select
          id="method"
          name="method"
          defaultValue="bank_transfer"
          className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
        >
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>
      <Field label="Reference" name="reference" />
      <Field label="Period start" name="period_start" type="date" />
      <Field label="Period end" name="period_end" type="date" />
      <Field label="Idempotency key" name="idempotency_key" />
      <Field label="Notes" name="notes" />
      <label className="inline-flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="confirm" defaultChecked />
        Mark as confirmed
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
      >
        {pending ? "Recording…" : "Record payment"}
      </button>
    </form>
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

  if (payment.status === "voided") {
    return (
      <p className="text-xs text-muted">
        Voided{payment.voidReason ? `: ${payment.voidReason}` : ""}
      </p>
    );
  }

  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="payment_id" value={payment.id} />
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <input
        name="void_reason"
        required
        placeholder="Void reason"
        className="min-w-[12rem] flex-1 rounded-md border border-line bg-paper-elevated px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-teal"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-ink underline-offset-2 hover:underline disabled:opacity-60"
      >
        Void
      </button>
      <Feedback state={state} />
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
      />
    </div>
  );
}
