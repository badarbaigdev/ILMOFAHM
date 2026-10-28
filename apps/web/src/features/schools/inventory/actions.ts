"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateInventoryItemId,
  validateInventoryItemInput,
  validateInventoryMovementInput,
} from "@/features/schools/inventory/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolInventoryActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateInventory(schoolId: string) {
  revalidatePath("/school/inventory");
  revalidatePath(`/school/inventory?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/inventory?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

function mapError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("Not authorized")) {
    return "You are not allowed to manage inventory.";
  }
  if (message.includes("Cannot issue more")) {
    return message;
  }
  if (message.includes("duplicate") || message.includes("unique")) {
    return "An item with that SKU already exists.";
  }
  return message;
}

export async function createSchoolInventoryItemAction(
  _prev: SchoolInventoryActionState,
  formData: FormData,
): Promise<SchoolInventoryActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateInventoryItemInput({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    quantity: String(formData.get("quantity") ?? "0"),
    reorderLevel: String(formData.get("reorder_level") ?? "0"),
    condition: String(formData.get("condition") ?? "good"),
    unit: String(formData.get("unit") ?? "pcs"),
    sku: String(formData.get("sku") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    requireQuantity: true,
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "inventory.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_inventory_item", {
    p_school_id: schoolId,
    p_name: validated.value.name,
    p_category: validated.value.category,
    p_quantity: validated.value.quantity,
    p_reorder_level: validated.value.reorderLevel,
    p_condition: validated.value.condition,
    p_unit: validated.value.unit,
    p_sku: validated.value.sku,
    p_location: validated.value.location,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not create inventory item."),
      success: null,
    };
  }

  revalidateInventory(schoolId);
  return { error: null, success: "Inventory item added." };
}

export async function updateSchoolInventoryItemAction(
  _prev: SchoolInventoryActionState,
  formData: FormData,
): Promise<SchoolInventoryActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const itemIdRaw = String(formData.get("item_id") ?? "");
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }
  const idCheck = validateInventoryItemId(itemIdRaw);
  if (!idCheck.ok) return { error: idCheck.error, success: null };

  const validated = validateInventoryItemInput({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    quantity: "0",
    reorderLevel: String(formData.get("reorder_level") ?? "0"),
    condition: String(formData.get("condition") ?? "good"),
    unit: String(formData.get("unit") ?? "pcs"),
    sku: String(formData.get("sku") ?? ""),
    location: String(formData.get("location") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    requireQuantity: false,
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "inventory.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("update_school_inventory_item", {
    p_item_id: idCheck.value,
    p_name: validated.value.name,
    p_category: validated.value.category,
    p_reorder_level: validated.value.reorderLevel,
    p_condition: validated.value.condition,
    p_unit: validated.value.unit,
    p_sku: validated.value.sku,
    p_location: validated.value.location,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not update inventory item."),
      success: null,
    };
  }

  revalidateInventory(schoolId);
  return { error: null, success: "Inventory item updated." };
}

export async function archiveSchoolInventoryItemAction(
  _prev: SchoolInventoryActionState,
  formData: FormData,
): Promise<SchoolInventoryActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const idCheck = validateInventoryItemId(
    String(formData.get("item_id") ?? ""),
  );
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }
  if (!idCheck.ok) return { error: idCheck.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "inventory.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("archive_school_inventory_item", {
    p_item_id: idCheck.value,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not remove inventory item."),
      success: null,
    };
  }

  revalidateInventory(schoolId);
  return { error: null, success: "Inventory item removed." };
}

export async function recordSchoolInventoryMovementAction(
  _prev: SchoolInventoryActionState,
  formData: FormData,
): Promise<SchoolInventoryActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateInventoryMovementInput({
    itemId: String(formData.get("item_id") ?? ""),
    movementType: String(formData.get("movement_type") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    occurredOn: String(formData.get("occurred_on") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "inventory.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("record_school_inventory_movement", {
    p_item_id: validated.value.itemId,
    p_movement_type: validated.value.movementType,
    p_quantity: validated.value.quantity,
    p_occurred_on: validated.value.occurredOn,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not record stock movement."),
      success: null,
    };
  }

  revalidateInventory(schoolId);
  return {
    error: null,
    success:
      validated.value.movementType === "stock_in"
        ? "Stock recorded."
        : "Issue recorded.",
  };
}
