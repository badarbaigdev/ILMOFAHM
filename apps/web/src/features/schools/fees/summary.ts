export type FeeChargeAmounts = {
  amount: string;
  amountPaid: string;
  dueDate: string;
  status: string;
};

export type FeeCollectionSummary = {
  collected: string;
  due: string;
  overdue: string;
};

export function summarizeFeeCharges(
  charges: FeeChargeAmounts[],
  todayIso = new Date().toISOString().slice(0, 10),
): FeeCollectionSummary {
  let collected = 0;
  let due = 0;
  let overdue = 0;

  for (const charge of charges) {
    if (charge.status === "cancelled") continue;
    const paid = Number(charge.amountPaid);
    const amount = Number(charge.amount);
    const remaining = Math.max(0, amount - paid);
    collected += paid;
    if (remaining > 0) {
      if (charge.dueDate < todayIso) {
        overdue += remaining;
      } else {
        due += remaining;
      }
    }
  }

  return {
    collected: collected.toFixed(2),
    due: due.toFixed(2),
    overdue: overdue.toFixed(2),
  };
}
