import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateAssignSubscriptionInput,
  validatePaymentInput,
} from "./validate";

const SCHOOL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("validateAssignSubscriptionInput", () => {
  it("accepts a valid assignment", () => {
    const result = validateAssignSubscriptionInput({
      schoolId: SCHOOL_ID,
      planId: "growth",
      status: "active",
      billingContactEmail: "Billing@School.Test",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.billingContactEmail, "billing@school.test");
    }
  });

  it("rejects invalid status", () => {
    assert.equal(
      validateAssignSubscriptionInput({
        schoolId: SCHOOL_ID,
        planId: "starter",
        status: "paid",
      }).ok,
      false,
    );
  });
});

describe("validatePaymentInput", () => {
  it("accepts decimal amounts", () => {
    const result = validatePaymentInput({
      subscriptionId: SUB_ID,
      amount: "15000.50",
      method: "bank_transfer",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.amount, 15000.5);
    }
  });

  it("rejects zero and bad periods", () => {
    assert.equal(
      validatePaymentInput({
        subscriptionId: SUB_ID,
        amount: "0",
        method: "cash",
      }).ok,
      false,
    );
    assert.equal(
      validatePaymentInput({
        subscriptionId: SUB_ID,
        amount: "10",
        method: "cash",
        periodStart: "2026-10-31",
        periodEnd: "2026-10-01",
      }).ok,
      false,
    );
  });
});
