export const INVENTORY_CATEGORIES = [
  { value: "furniture", label: "Furniture" },
  { value: "stationery", label: "Stationery" },
  { value: "lab", label: "Lab equipment" },
  { value: "sports", label: "Sports" },
  { value: "electronics", label: "Electronics" },
  { value: "books", label: "Books" },
  { value: "cleaning", label: "Cleaning" },
  { value: "uniforms", label: "Uniforms" },
  { value: "other", label: "Other" },
] as const;

export const INVENTORY_CONDITIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "damaged", label: "Damaged" },
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number]["value"];
export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number]["value"];

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseNonNegInt(raw: string, label: string): ValidateResult<number> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: `${label} is required.` };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, error: `${label} must be a whole number ≥ 0.` };
  }
  return { ok: true, value: n };
}

export function isLowStock(quantity: number, reorderLevel: number): boolean {
  return quantity <= reorderLevel;
}

export function validateInventoryItemInput(raw: {
  name: string;
  category: string;
  quantity: string;
  reorderLevel: string;
  condition: string;
  unit: string;
  sku: string;
  location: string;
  notes: string;
  requireQuantity: boolean;
}): ValidateResult<{
  name: string;
  category: InventoryCategory;
  quantity: number;
  reorderLevel: number;
  condition: InventoryCondition;
  unit: string;
  sku: string | null;
  location: string | null;
  notes: string | null;
}> {
  const name = raw.name.trim();
  if (!name) return { ok: false, error: "Item name is required." };
  if (name.length > 160) {
    return { ok: false, error: "Name must be 160 characters or fewer." };
  }

  const category = raw.category.trim() as InventoryCategory;
  if (!INVENTORY_CATEGORIES.some((c) => c.value === category)) {
    return { ok: false, error: "Select a valid category." };
  }

  const condition = raw.condition.trim() as InventoryCondition;
  if (!INVENTORY_CONDITIONS.some((c) => c.value === condition)) {
    return { ok: false, error: "Select a valid condition." };
  }

  let quantity = 0;
  if (raw.requireQuantity) {
    const qty = parseNonNegInt(raw.quantity, "Quantity");
    if (!qty.ok) return qty;
    quantity = qty.value;
  }

  const reorder = parseNonNegInt(raw.reorderLevel || "0", "Reorder level");
  if (!reorder.ok) return reorder;

  const unit = raw.unit.trim() || "pcs";
  if (unit.length > 24) {
    return { ok: false, error: "Unit must be 24 characters or fewer." };
  }

  const sku = raw.sku.trim() || null;
  if (sku && sku.length > 64) {
    return { ok: false, error: "SKU must be 64 characters or fewer." };
  }

  const location = raw.location.trim() || null;
  if (location && location.length > 120) {
    return { ok: false, error: "Location must be 120 characters or fewer." };
  }

  const notes = raw.notes.trim() || null;
  if (notes && notes.length > 500) {
    return { ok: false, error: "Notes must be 500 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      name,
      category,
      quantity,
      reorderLevel: reorder.value,
      condition,
      unit,
      sku,
      location,
      notes,
    },
  };
}

export function validateInventoryMovementInput(raw: {
  itemId: string;
  movementType: string;
  quantity: string;
  occurredOn: string;
  notes: string;
}): ValidateResult<{
  itemId: string;
  movementType: "stock_in" | "issue";
  quantity: number;
  occurredOn: string | null;
  notes: string | null;
}> {
  const itemId = raw.itemId.trim();
  if (!UUID_RE.test(itemId)) {
    return { ok: false, error: "Select an inventory item." };
  }

  const movementType = raw.movementType.trim();
  if (movementType !== "stock_in" && movementType !== "issue") {
    return { ok: false, error: "Choose stock in or issue." };
  }

  const qtyRaw = raw.quantity.trim();
  const quantity = Number(qtyRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: "Quantity must be a whole number greater than 0." };
  }

  const occurredOn = raw.occurredOn.trim() || null;
  const notes = raw.notes.trim() || null;
  if (notes && notes.length > 500) {
    return { ok: false, error: "Notes must be 500 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      itemId,
      movementType,
      quantity,
      occurredOn,
      notes,
    },
  };
}

export function validateInventoryItemId(raw: string): ValidateResult<string> {
  const id = raw.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Inventory item is required." };
  }
  return { ok: true, value: id };
}
