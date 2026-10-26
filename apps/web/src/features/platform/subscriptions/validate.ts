export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "grace"
  | "cancelled"
  | "suspended"
  | "expired";

export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "other";

const STATUSES = new Set<SubscriptionStatus>([
  "trial",
  "active",
  "past_due",
  "grace",
  "cancelled",
  "suspended",
  "expired",
]);

const METHODS = new Set<PaymentMethod>([
  "bank_transfer",
  "cash",
  "cheque",
  "other",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return STATUSES.has(value as SubscriptionStatus);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return METHODS.has(value as PaymentMethod);
}

export function validateAssignSubscriptionInput(input: {
  schoolId: string;
  planId: string;
  status: string;
  billingContactName?: string;
  billingContactEmail?: string;
  notes?: string;
}): { ok: true; value: {
  schoolId: string;
  planId: string;
  status: SubscriptionStatus;
  billingContactName: string | null;
  billingContactEmail: string | null;
  notes: string | null;
} } | { ok: false; error: string } {
  const schoolId = input.schoolId.trim();
  const planId = input.planId.trim();
  const status = input.status.trim();
  const billingContactName = optional(input.billingContactName);
  const billingContactEmail = optional(input.billingContactEmail)?.toLowerCase() ?? null;
  const notes = optional(input.notes);

  if (!isUuid(schoolId)) {
    return { ok: false, error: "School is required." };
  }
  if (!planId) {
    return { ok: false, error: "Choose a plan." };
  }
  if (!isSubscriptionStatus(status)) {
    return { ok: false, error: "Choose a valid subscription status." };
  }
  if (billingContactEmail && !EMAIL_RE.test(billingContactEmail)) {
    return { ok: false, error: "Enter a valid billing email, or leave it blank." };
  }

  return {
    ok: true,
    value: {
      schoolId,
      planId,
      status,
      billingContactName,
      billingContactEmail,
      notes,
    },
  };
}

export function validatePaymentInput(input: {
  subscriptionId: string;
  amount: string;
  currencyCode?: string;
  method: string;
  reference?: string;
  notes?: string;
  periodStart?: string;
  periodEnd?: string;
  idempotencyKey?: string;
}): { ok: true; value: {
  subscriptionId: string;
  amount: number;
  currencyCode: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  idempotencyKey: string | null;
} } | { ok: false; error: string } {
  const subscriptionId = input.subscriptionId.trim();
  if (!isUuid(subscriptionId)) {
    return { ok: false, error: "Subscription is required." };
  }

  const amountRaw = input.amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amountRaw)) {
    return { ok: false, error: "Enter a valid amount with up to 2 decimal places." };
  }
  const amount = Number(amountRaw);
  if (!(amount > 0)) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  const currencyCode = (input.currencyCode ?? "PKR").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return { ok: false, error: "Currency must be a 3-letter code." };
  }

  const method = input.method.trim();
  if (!isPaymentMethod(method)) {
    return { ok: false, error: "Choose a payment method." };
  }

  const periodStart = optional(input.periodStart);
  const periodEnd = optional(input.periodEnd);
  if (periodStart && !/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) {
    return { ok: false, error: "Period start must be a valid date." };
  }
  if (periodEnd && !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return { ok: false, error: "Period end must be a valid date." };
  }
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return { ok: false, error: "Period end must be on or after period start." };
  }

  return {
    ok: true,
    value: {
      subscriptionId,
      amount,
      currencyCode,
      method,
      reference: optional(input.reference),
      notes: optional(input.notes),
      periodStart,
      periodEnd,
      idempotencyKey: optional(input.idempotencyKey),
    },
  };
}

function optional(value?: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
