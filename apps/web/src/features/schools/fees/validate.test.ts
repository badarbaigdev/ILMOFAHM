import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateFeeChargeInput,
  validateFeeHeadInput,
  validateFeePaymentInput,
} from "./validate";

describe("validateFeeHeadInput", () => {
  it("normalizes code and accepts amount", () => {
    const result = validateFeeHeadInput({
      code: " tuition ",
      name: "Monthly tuition",
      defaultAmount: "5000.50",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.code, "TUITION");
      assert.equal(result.value.defaultAmount, "5000.50");
    }
  });

  it("rejects negative amount", () => {
    const result = validateFeeHeadInput({
      code: "X",
      name: "Y",
      defaultAmount: "-1",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateFeeChargeInput", () => {
  it("accepts a valid charge", () => {
    const result = validateFeeChargeInput({
      studentId: "aaaaaaaa-1111-4111-8111-111111111111",
      feeHeadId: "bbbbbbbb-2222-4222-8222-222222222222",
      amount: "2500",
      dueDate: "2026-11-01",
    });
    assert.equal(result.ok, true);
  });

  it("rejects zero amount", () => {
    const result = validateFeeChargeInput({
      studentId: "aaaaaaaa-1111-4111-8111-111111111111",
      feeHeadId: "bbbbbbbb-2222-4222-8222-222222222222",
      amount: "0",
      dueDate: "2026-11-01",
    });
    assert.equal(result.ok, false);
  });
});

describe("validateFeePaymentInput", () => {
  it("accepts cash payment", () => {
    const result = validateFeePaymentInput({
      chargeId: "cccccccc-3333-4333-8333-333333333333",
      amount: "1000.00",
      method: "cash",
      receiptNumber: "RCPT-1",
      paidOn: "2026-10-20",
      idempotencyKey: "key-1",
      notes: "",
    });
    assert.equal(result.ok, true);
  });

  it("rejects missing receipt", () => {
    const result = validateFeePaymentInput({
      chargeId: "cccccccc-3333-4333-8333-333333333333",
      amount: "1000",
      method: "cash",
      receiptNumber: "",
      paidOn: "2026-10-20",
      idempotencyKey: "",
      notes: "",
    });
    assert.equal(result.ok, false);
  });
});
