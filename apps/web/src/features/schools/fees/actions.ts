"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  validateFeeChargeInput,
  validateFeeHeadInput,
  validateFeePaymentInput,
} from "@/features/schools/fees/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolFeeActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateFees(schoolId: string) {
  revalidatePath("/school/fees");
  revalidatePath(`/school/fees?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/fees?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function createSchoolFeeHeadAction(
  _prev: SchoolFeeActionState,
  formData: FormData,
): Promise<SchoolFeeActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateFeeHeadInput({
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    defaultAmount: String(formData.get("default_amount") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "fee.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_fee_head", {
    p_school_id: schoolId,
    p_code: validated.value.code,
    p_name: validated.value.name,
    p_default_amount: validated.value.defaultAmount,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return { error: "You are not allowed to manage fees.", success: null };
    }
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return {
        error: "A fee head with this code already exists.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not create fee head.",
      success: null,
    };
  }

  revalidateFees(schoolId);
  return { error: null, success: "Fee head created." };
}

export async function createSchoolFeeChargeAction(
  _prev: SchoolFeeActionState,
  formData: FormData,
): Promise<SchoolFeeActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateFeeChargeInput({
    studentId: String(formData.get("student_id") ?? ""),
    feeHeadId: String(formData.get("fee_head_id") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    dueDate: String(formData.get("due_date") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "fee.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_fee_charge", {
    p_school_id: schoolId,
    p_student_id: validated.value.studentId,
    p_fee_head_id: validated.value.feeHeadId,
    p_amount: validated.value.amount,
    p_due_date: validated.value.dueDate,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return { error: "You are not allowed to manage fees.", success: null };
    }
    return {
      error: error.message || "Could not create charge.",
      success: null,
    };
  }

  revalidateFees(schoolId);
  return { error: null, success: "Charge created." };
}

export async function recordSchoolFeePaymentAction(
  _prev: SchoolFeeActionState,
  formData: FormData,
): Promise<SchoolFeeActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateFeePaymentInput({
    chargeId: String(formData.get("charge_id") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    method: String(formData.get("method") ?? ""),
    receiptNumber: String(formData.get("receipt_number") ?? ""),
    paidOn: String(formData.get("paid_on") ?? ""),
    idempotencyKey: String(formData.get("idempotency_key") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "fee.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("record_school_fee_payment", {
    p_charge_id: validated.value.chargeId,
    p_amount: validated.value.amount,
    p_method: validated.value.method,
    p_receipt_number: validated.value.receiptNumber,
    p_paid_on: validated.value.paidOn,
    p_idempotency_key: validated.value.idempotencyKey,
    p_notes: validated.value.notes,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return { error: "You are not allowed to manage fees.", success: null };
    }
    if (error.message?.includes("exceed")) {
      return {
        error: "Payment would exceed the remaining charge balance.",
        success: null,
      };
    }
    if (error.message?.includes("already paid")) {
      return { error: "This charge is already paid in full.", success: null };
    }
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return {
        error: "Receipt number or idempotency key already used.",
        success: null,
      };
    }
    return {
      error: error.message || "Could not record payment.",
      success: null,
    };
  }

  revalidateFees(schoolId);
  return { error: null, success: "Payment recorded." };
}
