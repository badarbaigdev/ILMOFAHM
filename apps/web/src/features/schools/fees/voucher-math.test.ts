import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  remainingChargeAmount,
  sumIncludedLines,
} from "./voucher-math";

describe("sumIncludedLines", () => {
  it("sums only included lines and rounds to cents", () => {
    assert.equal(
      sumIncludedLines([
        { id: "a", label: "Tuition", amount: 1000.1, included: true },
        { id: "b", label: "Sports", amount: 500.05, included: true },
        { id: "c", label: "Fine", amount: 200, included: false },
      ]),
      1500.15,
    );
  });
});

describe("remainingChargeAmount", () => {
  it("returns unpaid remainder floored at zero", () => {
    assert.equal(remainingChargeAmount("1000.00", "250.00"), 750);
    assert.equal(remainingChargeAmount("100.00", "100.00"), 0);
    assert.equal(remainingChargeAmount("50.00", "80.00"), 0);
  });
});
