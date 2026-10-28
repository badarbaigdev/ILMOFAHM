import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isLowStock } from "@/features/schools/inventory/validate";

export type SchoolInventoryItemRow = {
  id: string;
  schoolId: string;
  name: string;
  sku: string | null;
  category: string;
  quantity: number;
  reorderLevel: number;
  condition: string;
  unit: string;
  location: string | null;
  notes: string | null;
  status: string;
  lowStock: boolean;
};

export type SchoolInventoryMovementRow = {
  id: string;
  schoolId: string;
  itemId: string;
  movementType: string;
  quantity: number;
  occurredOn: string;
  notes: string | null;
  createdAt: string;
};

export async function listSchoolInventoryItems(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolInventoryItemRow[]> {
  const { data, error } = await supabase
    .from("school_inventory_items")
    .select(
      "id, school_id, name, sku, category, quantity, reorder_level, condition, unit, location, notes, status",
    )
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load inventory items.");
  }

  return (data ?? []).map((row) => {
    const quantity = Number(row.quantity);
    const reorderLevel = Number(row.reorder_level);
    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity,
      reorderLevel,
      condition: row.condition,
      unit: row.unit,
      location: row.location,
      notes: row.notes,
      status: row.status,
      lowStock: isLowStock(quantity, reorderLevel),
    };
  });
}

export async function listSchoolInventoryMovements(
  supabase: SupabaseClient,
  schoolId: string,
  limit = 100,
): Promise<SchoolInventoryMovementRow[]> {
  const { data, error } = await supabase
    .from("school_inventory_movements")
    .select(
      "id, school_id, item_id, movement_type, quantity, occurred_on, notes, created_at",
    )
    .eq("school_id", schoolId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Could not load inventory movements.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    itemId: row.item_id,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    occurredOn: row.occurred_on,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}
