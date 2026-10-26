import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeFeeCharges, type FeeChargeAmounts } from "./summary";

function charge(
  partial: Partial<FeeChargeAmounts> & Pick<FeeChargeAmounts, "amount">,
): FeeChargeAmounts {
  return {
    amountPaid: "0.00",
    dueDate: "2026-12-01",
    status: "due",
    ...partial,
  };
}

describe("summarizeFeeCharges", () => {
  it("splits collected, due, and overdue", () => {
    const summary = summarizeFeeCharges(
      [
        charge({ amount: "5000", amountPaid: "2000", status: "partial" }),
        charge({
          amount: "3000",
          amountPaid: "0",
          dueDate: "2026-01-01",
          status: "due",
        }),
        charge({
          amount: "1000",
          amountPaid: "1000",
          status: "paid",
        }),
        charge({
          amount: "500",
          amountPaid: "0",
          status: "cancelled",
        }),
      ],
      "2026-10-22",
    );
    assert.equal(summary.collected, "3000.00");
    assert.equal(summary.due, "3000.00");
    assert.equal(summary.overdue, "3000.00");
  });
});
