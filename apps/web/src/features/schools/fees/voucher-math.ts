export type FeeVoucherLine = {
  id: string;
  label: string;
  amount: number;
  included: boolean;
};

/** Default optional add-ons offered on fee bill previews. */
export const FEE_VOUCHER_ADDONS = [
  { id: "sports", label: "Sports", defaultAmount: 500 },
  { id: "uniform", label: "Uniform", defaultAmount: 1500 },
  { id: "fine", label: "Fine", defaultAmount: 200 },
  { id: "transport", label: "Transport", defaultAmount: 2000 },
  { id: "other", label: "Other charges", defaultAmount: 500 },
] as const;

export function parseMoney(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatFeeMoney(amount: number): string {
  return `₨ ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Sum of included line amounts (decimal-safe to 2 places). */
export function sumIncludedLines(lines: FeeVoucherLine[]): number {
  const total = lines
    .filter((line) => line.included)
    .reduce((sum, line) => sum + line.amount, 0);
  return Math.round(total * 100) / 100;
}

export function remainingChargeAmount(
  amount: string,
  amountPaid: string,
): number {
  const rem = parseMoney(amount) - parseMoney(amountPaid);
  return Math.max(0, Math.round(rem * 100) / 100);
}
