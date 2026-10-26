import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  summary: string;
  billingInterval: string;
  exampleAmount: number | null;
  currencyCode: string;
  highlights: string[];
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type SchoolSubscriptionRow = {
  id: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  status: string;
  billingInterval: string;
  startsAt: string;
  trialEndsAt: string | null;
  renewalAt: string | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  notes: string | null;
  isCurrent: boolean;
};

export type SubscriptionPaymentRow = {
  id: string;
  schoolId: string;
  schoolSubscriptionId: string;
  amount: number;
  currencyCode: string;
  status: string;
  paidAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  method: string;
  reference: string | null;
  notes: string | null;
  voidReason: string | null;
};

export async function listSubscriptionPlans(
  supabase: SupabaseClient,
): Promise<SubscriptionPlanRow[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, summary, billing_interval, example_amount, currency_code, highlights, is_public, is_active, sort_order",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Could not load subscription plans.");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    summary: String(row.summary),
    billingInterval: String(row.billing_interval),
    exampleAmount:
      row.example_amount == null ? null : Number(row.example_amount),
    currencyCode: String(row.currency_code),
    highlights: Array.isArray(row.highlights)
      ? row.highlights.map((h) => String(h))
      : [],
    isPublic: Boolean(row.is_public),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
  }));
}

export async function listSchoolSubscriptions(
  supabase: SupabaseClient,
  options?: { currentOnly?: boolean; status?: string },
): Promise<SchoolSubscriptionRow[]> {
  let query = supabase
    .from("school_subscriptions")
    .select(
      "id, school_id, plan_id, status, billing_interval, starts_at, trial_ends_at, renewal_at, billing_contact_name, billing_contact_email, notes, is_current, schools(name), subscription_plans(name)",
    )
    .order("created_at", { ascending: false });

  if (options?.currentOnly !== false) {
    query = query.eq("is_current", true);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load school subscriptions.");
  }

  return (data ?? []).map((row) => {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    const plan = Array.isArray(row.subscription_plans)
      ? row.subscription_plans[0]
      : row.subscription_plans;
    return {
      id: String(row.id),
      schoolId: String(row.school_id),
      schoolName: school?.name ? String(school.name) : "School",
      planId: String(row.plan_id),
      planName: plan?.name ? String(plan.name) : String(row.plan_id),
      status: String(row.status),
      billingInterval: String(row.billing_interval),
      startsAt: String(row.starts_at),
      trialEndsAt: row.trial_ends_at == null ? null : String(row.trial_ends_at),
      renewalAt: row.renewal_at == null ? null : String(row.renewal_at),
      billingContactName:
        row.billing_contact_name == null
          ? null
          : String(row.billing_contact_name),
      billingContactEmail:
        row.billing_contact_email == null
          ? null
          : String(row.billing_contact_email),
      notes: row.notes == null ? null : String(row.notes),
      isCurrent: Boolean(row.is_current),
    };
  });
}

export async function getSchoolSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<SchoolSubscriptionRow | null> {
  const rows = await listSchoolSubscriptions(supabase, { currentOnly: false });
  return rows.find((r) => r.id === subscriptionId) ?? null;
}

export async function listSubscriptionPayments(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionPaymentRow[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select(
      "id, school_id, school_subscription_id, amount, currency_code, status, paid_at, period_start, period_end, method, reference, notes, void_reason",
    )
    .eq("school_subscription_id", subscriptionId)
    .order("paid_at", { ascending: false });

  if (error) {
    throw new Error("Could not load subscription payments.");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    schoolId: String(row.school_id),
    schoolSubscriptionId: String(row.school_subscription_id),
    amount: Number(row.amount),
    currencyCode: String(row.currency_code),
    status: String(row.status),
    paidAt: String(row.paid_at),
    periodStart: row.period_start == null ? null : String(row.period_start),
    periodEnd: row.period_end == null ? null : String(row.period_end),
    method: String(row.method),
    reference: row.reference == null ? null : String(row.reference),
    notes: row.notes == null ? null : String(row.notes),
    voidReason: row.void_reason == null ? null : String(row.void_reason),
  }));
}

export async function countSubscriptionsByStatus(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("school_subscriptions")
    .select("status")
    .eq("is_current", true);

  if (error) {
    throw new Error("Could not count subscriptions.");
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const status = String(row.status);
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}
