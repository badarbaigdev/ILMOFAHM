import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type { FeeCollectionSummary } from "@/features/schools/fees/summary";
export { summarizeFeeCharges } from "@/features/schools/fees/summary";

export type SchoolFeeHeadRow = {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  defaultAmount: string;
  status: string;
};

export type SchoolFeeChargeRow = {
  id: string;
  schoolId: string;
  studentId: string;
  feeHeadId: string;
  amount: string;
  amountPaid: string;
  dueDate: string;
  status: string;
};

export type SchoolFeePaymentRow = {
  id: string;
  schoolId: string;
  chargeId: string;
  amount: string;
  method: string;
  paidOn: string;
  receiptNumber: string;
};

function money(value: unknown): string {
  if (typeof value === "number") return value.toFixed(2);
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }
  return "0.00";
}

export async function listSchoolFeeHeads(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolFeeHeadRow[]> {
  const { data, error } = await supabase
    .from("school_fee_heads")
    .select("id, school_id, code, name, default_amount, status")
    .eq("school_id", schoolId)
    .order("code", { ascending: true });

  if (error) {
    throw new Error("Could not load fee heads.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    name: row.name,
    defaultAmount: money(row.default_amount),
    status: row.status,
  }));
}

export async function listSchoolFeeCharges(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolFeeChargeRow[]> {
  const { data, error } = await supabase
    .from("school_fee_charges")
    .select(
      "id, school_id, student_id, fee_head_id, amount, amount_paid, due_date, status",
    )
    .eq("school_id", schoolId)
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error("Could not load fee charges.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    feeHeadId: row.fee_head_id,
    amount: money(row.amount),
    amountPaid: money(row.amount_paid),
    dueDate: row.due_date,
    status: row.status,
  }));
}

export async function listSchoolFeePayments(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolFeePaymentRow[]> {
  const { data, error } = await supabase
    .from("school_fee_payments")
    .select(
      "id, school_id, charge_id, amount, method, paid_on, receipt_number",
    )
    .eq("school_id", schoolId)
    .order("paid_on", { ascending: false });

  if (error) {
    throw new Error("Could not load fee payments.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    chargeId: row.charge_id,
    amount: money(row.amount),
    method: row.method,
    paidOn: row.paid_on,
    receiptNumber: row.receipt_number,
  }));
}
