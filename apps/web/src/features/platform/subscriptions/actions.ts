"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import {
  validateAssignSubscriptionInput,
  validatePaymentInput,
  isSubscriptionStatus,
} from "@/features/platform/subscriptions/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubscriptionActionState = {
  error: string | null;
  success: string | null;
};

async function requireOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/platform/subscriptions");
  }
  await authorizePlatform("platform.subscriptions.manage", supabase, {
    userId: user.id,
  });
  return { supabase, user };
}

export async function assignSchoolSubscriptionAction(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const validated = validateAssignSubscriptionInput({
    schoolId: String(formData.get("school_id") ?? ""),
    planId: String(formData.get("plan_id") ?? ""),
    status: String(formData.get("status") ?? "active"),
    billingContactName: String(formData.get("billing_contact_name") ?? ""),
    billingContactEmail: String(formData.get("billing_contact_email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("assign_school_subscription", {
    p_school_id: validated.value.schoolId,
    p_plan_id: validated.value.planId,
    p_status: validated.value.status,
    p_billing_contact_name: validated.value.billingContactName,
    p_billing_contact_email: validated.value.billingContactEmail,
    p_notes: validated.value.notes,
  });

  if (error) {
    return {
      error: error.message.includes("Not authorized")
        ? "You are not allowed to manage subscriptions."
        : "Could not assign the subscription.",
      success: null,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    subscription_id?: string;
  } | null;
  if (!row?.subscription_id) {
    return { error: "Could not assign the subscription.", success: null };
  }

  revalidatePath("/platform");
  revalidatePath("/platform/subscriptions");
  revalidatePath("/platform/schools");
  revalidatePath(`/platform/subscriptions/${row.subscription_id}`);
  return { error: null, success: "Subscription assigned." };
}

export async function setSubscriptionStatusAction(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!subscriptionId || !isSubscriptionStatus(status)) {
    return { error: "Subscription and status are required.", success: null };
  }

  const { supabase } = await requireOperator();
  const { error } = await supabase.rpc("set_school_subscription_status", {
    p_subscription_id: subscriptionId,
    p_status: status,
    p_notes: notes,
  });

  if (error) {
    return { error: "Could not update subscription status.", success: null };
  }

  revalidatePath("/platform/subscriptions");
  revalidatePath(`/platform/subscriptions/${subscriptionId}`);
  return { error: null, success: "Subscription status updated." };
}

export async function recordSubscriptionPaymentAction(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const validated = validatePaymentInput({
    subscriptionId: String(formData.get("subscription_id") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? "PKR"),
    method: String(formData.get("method") ?? "bank_transfer"),
    reference: String(formData.get("reference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    periodStart: String(formData.get("period_start") ?? ""),
    periodEnd: String(formData.get("period_end") ?? ""),
    idempotencyKey: String(formData.get("idempotency_key") ?? ""),
  });
  if (!validated.ok) {
    return { error: validated.error, success: null };
  }

  const confirm = String(formData.get("confirm") ?? "") === "on";

  const { supabase } = await requireOperator();
  const { data, error } = await supabase.rpc("record_subscription_payment", {
    p_school_subscription_id: validated.value.subscriptionId,
    p_amount: validated.value.amount,
    p_currency_code: validated.value.currencyCode,
    p_method: validated.value.method,
    p_reference: validated.value.reference,
    p_notes: validated.value.notes,
    p_period_start: validated.value.periodStart,
    p_period_end: validated.value.periodEnd,
    p_idempotency_key: validated.value.idempotencyKey,
    p_confirm: confirm,
  });

  if (error) {
    return { error: "Could not record the payment.", success: null };
  }

  const row = (Array.isArray(data) ? data[0] : data) as {
    already_recorded?: boolean;
  } | null;

  revalidatePath(`/platform/subscriptions/${validated.value.subscriptionId}`);
  return {
    error: null,
    success: row?.already_recorded
      ? "Payment already recorded (idempotent)."
      : "Payment recorded.",
  };
}

export async function voidSubscriptionPaymentAction(
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const paymentId = String(formData.get("payment_id") ?? "").trim();
  const subscriptionId = String(formData.get("subscription_id") ?? "").trim();
  const voidReason = String(formData.get("void_reason") ?? "").trim();

  if (!paymentId || !voidReason) {
    return { error: "Payment and void reason are required.", success: null };
  }

  const { supabase } = await requireOperator();
  const { error } = await supabase.rpc("void_subscription_payment", {
    p_payment_id: paymentId,
    p_void_reason: voidReason,
  });

  if (error) {
    return { error: "Could not void the payment.", success: null };
  }

  if (subscriptionId) {
    revalidatePath(`/platform/subscriptions/${subscriptionId}`);
  }
  revalidatePath("/platform/subscriptions");
  return { error: null, success: "Payment voided." };
}
