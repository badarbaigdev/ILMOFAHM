"use client";

import { useActionState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolFeeActionState,
  createSchoolFeeChargeAction,
  createSchoolFeeHeadAction,
  recordSchoolFeePaymentAction,
} from "@/features/schools/fees/actions";
import type {
  FeeCollectionSummary,
  SchoolFeeChargeRow,
  SchoolFeeHeadRow,
  SchoolFeePaymentRow,
} from "@/features/schools/fees/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: SchoolFeeActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  heads: SchoolFeeHeadRow[];
  charges: SchoolFeeChargeRow[];
  payments: SchoolFeePaymentRow[];
  students: SchoolStudentRow[];
  summary: FeeCollectionSummary;
  canManage: boolean;
};

function formatPkr(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `₨ ${amount}`;
  return `₨ ${n.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function SchoolFeesPanel({
  schoolId,
  heads,
  charges,
  payments,
  students,
  summary,
  canManage,
}: Props) {
  const [headState, headAction, headPending] = useActionState(
    createSchoolFeeHeadAction,
    initial,
  );
  const [chargeState, chargeAction, chargePending] = useActionState(
    createSchoolFeeChargeAction,
    initial,
  );
  const [payState, payAction, payPending] = useActionState(
    recordSchoolFeePaymentAction,
    initial,
  );

  const headDialog = useActionDialog(headState);
  const chargeDialog = useActionDialog(chargeState);
  const payDialog = useActionDialog(payState);

  const studentLabel = new Map(
    students.map((s) => [
      s.id,
      `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
    ]),
  );
  const headLabel = new Map(heads.map((h) => [h.id, `${h.code} · ${h.name}`]));
  const openCharges = charges.filter(
    (c) => c.status === "due" || c.status === "partial",
  );
  const activeHeads = heads.filter((h) => h.status === "active");
  const activeStudents = students.filter((s) => s.status === "active");

  return (
    <div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-line bg-paper-elevated p-4">
          <p className="text-xs text-muted uppercase">Collected</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatPkr(summary.collected)}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-paper-elevated p-4">
          <p className="text-xs text-muted uppercase">Due</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatPkr(summary.due)}
          </p>
        </article>
        <article className="rounded-xl border border-line bg-paper-elevated p-4">
          <p className="text-xs text-muted uppercase">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatPkr(summary.overdue)}
          </p>
        </article>
      </div>

      {canManage ? (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={headDialog.openDialog}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            Add fee head
          </button>
          <button
            type="button"
            onClick={chargeDialog.openDialog}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            Create charge
          </button>
          <button
            type="button"
            onClick={payDialog.openDialog}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Record payment
          </button>
        </div>
      ) : null}

      <section aria-labelledby="charges-heading" className="mt-8">
        <h2
          id="charges-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Charges
        </h2>
        <div className="mt-4">
          <SchoolDataTable
            rows={charges}
            rowKey={(row) => row.id}
            searchPlaceholder="Search charges"
            searchText={(row) =>
              [
                studentLabel.get(row.studentId) ?? "",
                headLabel.get(row.feeHeadId) ?? "",
                row.status,
                row.dueDate,
              ].join(" ")
            }
            filterOptions={[
              { value: "due", label: "Due" },
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            filterValue={(row) => row.status}
            emptyMessage="No fee charges yet."
            exportFileName="fee-charges"
            columns={[
              {
                id: "student",
                header: "Student",
                cell: (row) => {
                  const label = studentLabel.get(row.studentId) ?? "Student";
                  const [number, ...rest] = label.split(" · ");
                  return (
                    <PersonCell
                      name={rest.join(" · ") || label}
                      secondary={number !== label ? number : null}
                    />
                  );
                },
              },
              {
                id: "fee",
                header: "Fee",
                cell: (row) => headLabel.get(row.feeHeadId) ?? "Fee",
              },
              {
                id: "amount",
                header: "Amount",
                cell: (row) => formatPkr(row.amount),
              },
              {
                id: "paid",
                header: "Paid",
                cell: (row) => formatPkr(row.amountPaid),
              },
              {
                id: "due",
                header: "Due",
                cell: (row) => formatListDate(row.dueDate),
              },
              {
                id: "status",
                header: "Status",
                cell: (row) => <StatusBadge status={row.status} />,
              },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="payments-heading" className="mt-10">
        <h2
          id="payments-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Recent payments
        </h2>
        <div className="mt-4">
          <SchoolDataTable
            rows={payments}
            rowKey={(row) => row.id}
            searchPlaceholder="Search payments"
            searchText={(row) =>
              [row.receiptNumber, row.method, row.amount, row.paidOn].join(" ")
            }
            emptyMessage="No payments recorded yet."
            exportFileName="fee-payments"
            selectable={false}
            columns={[
              {
                id: "receipt",
                header: "Receipt",
                cell: (row) => (
                  <span className="font-medium text-teal">
                    {row.receiptNumber}
                  </span>
                ),
              },
              {
                id: "amount",
                header: "Amount",
                cell: (row) => formatPkr(row.amount),
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
                id: "paid",
                header: "Paid on",
                cell: (row) => formatListDate(row.paidOn),
              },
            ]}
          />
        </div>
      </section>

      <FormDialog
        open={headDialog.open}
        onClose={headDialog.closeDialog}
        title="Add fee head"
        description="Define a fee type with a default amount for this school."
        submitLabel="Create fee head"
        formAction={headAction}
        busy={headPending}
        dirty={headDialog.dirty}
        onDirtyChange={headDialog.setDirty}
        error={headState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField id="fh-code" name="code" label="Code" required />
        <DialogField id="fh-name" name="name" label="Name" required />
        <DialogField
          id="fh-amount"
          name="default_amount"
          label="Default amount"
          required
          inputMode="decimal"
        />
      </FormDialog>

      <FormDialog
        open={chargeDialog.open}
        onClose={chargeDialog.closeDialog}
        title="Create charge"
        description="Bill a student against a fee head."
        submitLabel="Create charge"
        formAction={chargeAction}
        busy={chargePending}
        dirty={chargeDialog.dirty}
        onDirtyChange={chargeDialog.setDirty}
        error={chargeState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        {activeStudents.length === 0 || activeHeads.length === 0 ? (
          <p className="text-sm text-muted">
            Add at least one active student and fee head first.
          </p>
        ) : (
          <>
            <DialogSelect
              id="fc-student"
              name="student_id"
              label="Student"
              required
              options={activeStudents.map((s) => ({
                value: s.id,
                label: `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
              }))}
            />
            <DialogSelect
              id="fc-head"
              name="fee_head_id"
              label="Fee head"
              required
              options={activeHeads.map((h) => ({
                value: h.id,
                label: `${h.code} · ${h.name} (${formatPkr(h.defaultAmount)})`,
              }))}
            />
            <DialogField
              id="fc-amount"
              name="amount"
              label="Amount"
              required
              inputMode="decimal"
            />
            <DialogField
              id="fc-due"
              name="due_date"
              label="Due date"
              type="date"
              required
            />
          </>
        )}
      </FormDialog>

      <FormDialog
        open={payDialog.open}
        onClose={payDialog.closeDialog}
        title="Record payment"
        description="Collect payment against an open charge. Use an idempotency key when retrying."
        submitLabel="Record payment"
        formAction={payAction}
        busy={payPending}
        dirty={payDialog.dirty}
        onDirtyChange={payDialog.setDirty}
        error={payState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        {openCharges.length === 0 ? (
          <p className="text-sm text-muted">No open charges to collect against.</p>
        ) : (
          <>
            <DialogSelect
              id="fp-charge"
              name="charge_id"
              label="Open charge"
              required
              options={openCharges.map((c) => {
                const remaining = (
                  Number(c.amount) - Number(c.amountPaid)
                ).toFixed(2);
                return {
                  value: c.id,
                  label: `${studentLabel.get(c.studentId) ?? "Student"} · ${headLabel.get(c.feeHeadId) ?? "Fee"} · rem ${formatPkr(remaining)}`,
                };
              })}
            />
            <DialogField
              id="fp-amount"
              name="amount"
              label="Amount"
              required
              inputMode="decimal"
            />
            <DialogSelect
              id="fp-method"
              name="method"
              label="Method"
              required
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "cheque", label: "Cheque" },
                { value: "other", label: "Other" },
              ]}
            />
            <DialogField
              id="fp-receipt"
              name="receipt_number"
              label="Receipt number"
              required
            />
            <DialogField
              id="fp-paid"
              name="paid_on"
              label="Paid on"
              type="date"
            />
            <DialogField
              id="fp-idem"
              name="idempotency_key"
              label="Idempotency key (optional)"
            />
            <DialogField id="fp-notes" name="notes" label="Notes (optional)" />
          </>
        )}
      </FormDialog>
    </div>
  );
}
