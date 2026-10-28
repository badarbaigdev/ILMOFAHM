import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLowStock,
  validateInventoryItemInput,
  validateInventoryMovementInput,
} from "./validate";

describe("isLowStock", () => {
  it("flags quantity at or below reorder level", () => {
    assert.equal(isLowStock(5, 5), true);
    assert.equal(isLowStock(4, 5), true);
    assert.equal(isLowStock(6, 5), false);
  });
});

describe("validateInventoryItemInput", () => {
  it("accepts a valid item", () => {
    const result = validateInventoryItemInput({
      name: "Whiteboard markers",
      category: "stationery",
      quantity: "24",
      reorderLevel: "10",
      condition: "new",
      unit: "box",
      sku: "ST-001",
      location: "Store room A",
      notes: "",
      requireQuantity: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects blank name", () => {
    const result = validateInventoryItemInput({
      name: "  ",
      category: "stationery",
      quantity: "1",
      reorderLevel: "0",
      condition: "good",
      unit: "pcs",
      sku: "",
      location: "",
      notes: "",
      requireQuantity: true,
    });
    assert.equal(result.ok, false);
  });
});

describe("validateInventoryMovementInput", () => {
  it("rejects zero quantity", () => {
    const result = validateInventoryMovementInput({
      itemId: "11111111-1111-4111-8111-111111111111",
      movementType: "stock_in",
      quantity: "0",
      occurredOn: "",
      notes: "",
    });
    assert.equal(result.ok, false);
  });

  it("accepts an issue movement", () => {
    const result = validateInventoryMovementInput({
      itemId: "11111111-1111-4111-8111-111111111111",
      movementType: "issue",
      quantity: "3",
      occurredOn: "2026-10-01",
      notes: "Issued to Grade 9",
    });
    assert.equal(result.ok, true);
  });
});
