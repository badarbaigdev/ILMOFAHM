"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/dialog";
import {
  FEE_VOUCHER_ADDONS,
  formatFeeMoney,
  remainingChargeAmount,
  sumIncludedLines,
  type FeeVoucherLine,
} from "@/features/schools/fees/voucher-math";
import type {
  SchoolFeeChargeRow,
  SchoolFeeHeadRow,
} from "@/features/schools/fees/queries";
import { printElement } from "@/features/schools/print/print-element";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import {
  PersonAvatar,
  formatListDate,
} from "@/features/schools/ui/data-table";
import { SchoolLogo } from "@/features/schools/ui/school-logo";

type Props = {
  open: boolean;
  onClose: () => void;
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolContact?: string | null;
  student: SchoolStudentRow;
  charge: SchoolFeeChargeRow;
  feeHead: SchoolFeeHeadRow | null;
};

export function FeeVoucherDialog({
  open,
  onClose,
  schoolName,
  schoolLogoUrl,
  schoolContact,
  student,
  charge,
  feeHead,
}: Props) {
  const faceRef = useRef<HTMLElement>(null);
  const baseAmount = remainingChargeAmount(charge.amount, charge.amountPaid);
  const baseLabel = feeHead
    ? `${feeHead.code} · ${feeHead.name}`
    : "Fee charge";

  const [addons, setAddons] = useState<FeeVoucherLine[]>(() =>
    FEE_VOUCHER_ADDONS.map((a) => ({
      id: a.id,
      label: a.label,
      amount: a.defaultAmount,
      included: false,
    })),
  );

  useEffect(() => {
    if (!open) return;
    setAddons(
      FEE_VOUCHER_ADDONS.map((a) => ({
        id: a.id,
        label: a.label,
        amount: a.defaultAmount,
        included: false,
      })),
    );
  }, [open, charge.id]);

  const lines = useMemo<FeeVoucherLine[]>(
    () => [
      {
        id: `charge-${charge.id}`,
        label: baseLabel,
        amount: baseAmount,
        included: true,
      },
      ...addons,
    ],
    [addons, baseAmount, baseLabel, charge.id],
  );

  const total = sumIncludedLines(lines);
  const studentName = `${student.firstName} ${student.lastName}`;
  const isPending = charge.status === "due" || charge.status === "partial";

  function toggleAddon(id: string) {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, included: !a.included } : a)),
    );
  }

  function setAddonAmount(id: string, raw: string) {
    const amount = Number(raw);
    setAddons((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
            }
          : a,
      ),
    );
  }

  function handlePrint() {
    if (!faceRef.current) return;
    printElement(
      faceRef.current,
      `Fee voucher · ${studentName} · ${student.studentNumber}`,
    );
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Fee voucher"
      description="Preview a printable fee bill. Toggle optional charges to recalculate the total."
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
            onClick={handlePrint}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            Print bill
          </button>
        </>
      }
    >
      <article
        ref={faceRef}
        className="school-print-face rounded-2xl border border-line bg-paper-elevated p-5"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <SchoolLogo
              schoolName={schoolName}
              logoUrl={schoolLogoUrl}
              size="md"
            />
            <div>
              <p className="text-sm font-semibold text-ink">{schoolName}</p>
              <p className="text-xs text-muted">
                {isPending ? "Fee bill · Pending" : "Fee bill"}
              </p>
              {schoolContact ? (
                <p className="mt-0.5 text-xs text-muted">{schoolContact}</p>
              ) : null}
            </div>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
              isPending
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {charge.status}
          </span>
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PersonAvatar
            name={studentName}
            photoUrl={student.photoUrl}
            size="lg"
          />
          <div>
            <p className="font-semibold text-ink">{studentName}</p>
            <p className="text-sm text-muted">
              Admission {student.studentNumber}
            </p>
            <p className="text-sm text-muted">
              Due {formatListDate(charge.dueDate)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="school-print-screen-only py-2 pr-2 font-medium">
                  Include
                </th>
                <th className="py-2 pr-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              <tr>
                <td className="school-print-screen-only py-2.5 pr-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    aria-label="Base fee included"
                  />
                </td>
                <td className="py-2.5 pr-2 text-ink">{baseLabel}</td>
                <td className="py-2.5 text-right font-medium text-ink">
                  {formatFeeMoney(baseAmount)}
                </td>
              </tr>
              {addons.map((addon) => (
                <tr
                  key={addon.id}
                  data-print-hidden={addon.included ? "false" : "true"}
                >
                  <td className="school-print-screen-only py-2.5 pr-2">
                    <input
                      type="checkbox"
                      checked={addon.included}
                      onChange={() => toggleAddon(addon.id)}
                      aria-label={`Include ${addon.label}`}
                    />
                  </td>
                  <td className="py-2.5 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={addon.included ? "text-ink" : "text-muted"}
                      >
                        {addon.label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={addon.amount}
                        onChange={(e) =>
                          setAddonAmount(addon.id, e.target.value)
                        }
                        className="school-print-screen-only w-24 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
                        aria-label={`${addon.label} amount`}
                      />
                    </div>
                  </td>
                  <td
                    className={`py-2.5 text-right font-medium ${
                      addon.included ? "text-ink" : "text-muted"
                    }`}
                  >
                    {formatFeeMoney(addon.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td className="school-print-screen-only py-3" />
                <td className="py-3 font-semibold text-ink">Total payable</td>
                <td className="py-3 text-right text-lg font-semibold text-teal">
                  {formatFeeMoney(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="school-print-screen-only mt-4 text-xs text-muted">
          This is a preview voucher. Optional lines are for printing only —
          record formal charges and payments from Fees collection to keep the
          ledger accurate.
        </p>
      </article>
    </AppDialog>
  );
}
