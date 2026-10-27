"use client";

import { AppDialog } from "@/components/ui/dialog";
import { formatFeeMoney, parseMoney } from "@/features/schools/fees/voucher-math";
import type {
  SchoolFeeChargeRow,
  SchoolFeeHeadRow,
  SchoolFeePaymentRow,
} from "@/features/schools/fees/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import { PersonAvatar, formatListDate } from "@/features/schools/ui/data-table";
import { SchoolLogo } from "@/features/schools/ui/school-logo";

type Props = {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolContact?: string | null;
  payment: SchoolFeePaymentRow;
  charge: SchoolFeeChargeRow | null;
  feeHead: SchoolFeeHeadRow | null;
  student: SchoolStudentRow | null;
};

export function PaymentReceiptDialog({
  open,
  onClose,
  schoolName,
  schoolLogoUrl,
  schoolContact,
  payment,
  charge,
  feeHead,
  student,
}: Props) {
  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : "Student";
  const outstanding = charge
    ? Math.max(
        0,
        Math.round(
          (parseMoney(charge.amount) - parseMoney(charge.amountPaid)) * 100,
        ) / 100,
      )
    : 0;
  const methodLabel = payment.method.replaceAll("_", " ");

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Payment receipt"
      description="Printable receipt for a completed fee payment."
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Print receipt
          </button>
        </>
      }
    >
      <div className="payment-receipt-print-root">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .payment-receipt-print-root,
            .payment-receipt-print-root * { visibility: visible !important; }
            .payment-receipt-print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 16px;
              background: white;
            }
          }
        `}</style>

        <article className="rounded-2xl border border-line bg-paper-elevated p-5">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <SchoolLogo
                schoolName={schoolName}
                logoUrl={schoolLogoUrl}
                size="md"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{schoolName}</p>
                <p className="text-xs text-muted">Payment receipt · Paid</p>
                {schoolContact ? (
                  <p className="mt-0.5 text-xs text-muted">{schoolContact}</p>
                ) : null}
              </div>
            </div>
            <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              Paid
            </span>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PersonAvatar
              name={studentName}
              photoUrl={student?.photoUrl}
              size="lg"
            />
            <div>
              <p className="font-semibold text-ink">{studentName}</p>
              {student ? (
                <p className="text-sm text-muted">
                  Admission {student.studentNumber}
                </p>
              ) : null}
              {feeHead ? (
                <p className="text-sm text-muted">
                  {feeHead.code} · {feeHead.name}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper px-3 py-3">
              <dt className="text-xs tracking-wide text-muted uppercase">
                Amount paid
              </dt>
              <dd className="mt-1 text-xl font-semibold text-teal">
                {formatFeeMoney(parseMoney(payment.amount))}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-paper px-3 py-3">
              <dt className="text-xs tracking-wide text-muted uppercase">
                Outstanding balance
              </dt>
              <dd className="mt-1 text-xl font-semibold text-ink">
                {formatFeeMoney(outstanding)}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">
                Payment date
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {formatListDate(payment.paidOn)}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">
                Payment method
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink capitalize">
                {methodLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-muted uppercase">
                Receipt / reference
              </dt>
              <dd className="mt-1 text-sm font-medium text-teal">
                {payment.receiptNumber}
              </dd>
            </div>
            {charge ? (
              <div>
                <dt className="text-xs tracking-wide text-muted uppercase">
                  Charge status
                </dt>
                <dd className="mt-1 text-sm font-medium capitalize text-ink">
                  {charge.status}
                </dd>
              </div>
            ) : null}
          </dl>
        </article>
      </div>
    </AppDialog>
  );
}
