export type FeeHeadInput = {
  code: string;
  name: string;
  defaultAmount: string;
};

export type FeeChargeInput = {
  studentId: string;
  feeHeadId: string;
  amount: string;
  dueDate: string;
};

export type FeePaymentInput = {
  chargeId: string;
  amount: string;
  method: FeePaymentMethod;
  receiptNumber: string;
  paidOn: string;
  idempotencyKey: string | null;
  notes: string | null;
};

export type FeePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "other";

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

const METHODS: readonly FeePaymentMethod[] = [
  "cash",
  "bank_transfer",
  "cheque",
  "other",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function parseDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

function parseAmount(raw: string): string | null {
  const value = raw.trim();
  if (!AMOUNT_RE.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return value;
}

export function validateFeeHeadInput(raw: {
  code: string;
  name: string;
  defaultAmount: string;
}): ValidateResult<FeeHeadInput> {
  const code = raw.code.trim().toUpperCase();
  const name = raw.name.trim();
  if (!code || !name) {
    return { ok: false, error: "Code and name are required." };
  }
  if (code.length > 32 || name.length > 120) {
    return { ok: false, error: "Code or name is too long." };
  }
  const defaultAmount = parseAmount(raw.defaultAmount);
  if (defaultAmount === null) {
    return {
      ok: false,
      error: "Enter a valid default amount (up to 2 decimal places).",
    };
  }
  return { ok: true, value: { code, name, defaultAmount } };
}

export function validateFeeChargeInput(raw: {
  studentId: string;
  feeHeadId: string;
  amount: string;
  dueDate: string;
}): ValidateResult<FeeChargeInput> {
  const studentId = raw.studentId.trim();
  const feeHeadId = raw.feeHeadId.trim();
  if (!UUID_RE.test(studentId) || !UUID_RE.test(feeHeadId)) {
    return { ok: false, error: "Student and fee head are required." };
  }
  const amount = parseAmount(raw.amount);
  if (amount === null || Number(amount) <= 0) {
    return {
      ok: false,
      error: "Enter a charge amount greater than zero.",
    };
  }
  const dueDate = raw.dueDate.trim();
  if (!parseDate(dueDate)) {
    return { ok: false, error: "Enter a valid due date (YYYY-MM-DD)." };
  }
  return { ok: true, value: { studentId, feeHeadId, amount, dueDate } };
}

export function validateFeePaymentInput(raw: {
  chargeId: string;
  amount: string;
  method: string;
  receiptNumber: string;
  paidOn: string;
  idempotencyKey: string;
  notes: string;
}): ValidateResult<FeePaymentInput> {
  const chargeId = raw.chargeId.trim();
  if (!UUID_RE.test(chargeId)) {
    return { ok: false, error: "Charge is required." };
  }
  const amount = parseAmount(raw.amount);
  if (amount === null || Number(amount) <= 0) {
    return {
      ok: false,
      error: "Enter a payment amount greater than zero.",
    };
  }
  const method = raw.method.trim() as FeePaymentMethod;
  if (!METHODS.includes(method)) {
    return { ok: false, error: "Select a valid payment method." };
  }
  const receiptNumber = raw.receiptNumber.trim();
  if (!receiptNumber) {
    return { ok: false, error: "Receipt number is required." };
  }
  if (receiptNumber.length > 64) {
    return { ok: false, error: "Receipt number must be 64 characters or fewer." };
  }
  const paidOn =
    raw.paidOn.trim() || new Date().toISOString().slice(0, 10);
  if (!parseDate(paidOn)) {
    return { ok: false, error: "Enter a valid payment date (YYYY-MM-DD)." };
  }
  const idempotencyKey = raw.idempotencyKey.trim() || null;
  if (idempotencyKey && idempotencyKey.length > 128) {
    return { ok: false, error: "Idempotency key is too long." };
  }
  const notes = raw.notes.trim() || null;
  if (notes && notes.length > 500) {
    return { ok: false, error: "Notes must be 500 characters or fewer." };
  }
  return {
    ok: true,
    value: {
      chargeId,
      amount,
      method,
      receiptNumber,
      paidOn,
      idempotencyKey,
      notes,
    },
  };
}
