/**
 * Canonical ILMOFAHM product copy.
 * Keep in sync with docs/00-brand-and-product.md.
 */
export const brand = {
  institutionalLabel: "INSTITUTIONAL TECHNOLOGY",
  productName: "ILMOFAHM",
  tagline: "One system. Every institution.",
  descriptor:
    "Centralized school and academy management, designed for complete institutional visibility.",
} as const;

export type Brand = typeof brand;
