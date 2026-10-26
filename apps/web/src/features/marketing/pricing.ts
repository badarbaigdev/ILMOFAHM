/**
 * Central plan definitions for the public pricing page.
 * Platform operators manage the DB catalog `subscription_plans` (Phase 9).
 * This file remains the marketing page source until a public DB read is wired.
 * Amounts are illustrative examples — not confirmed commercial prices.
 */

export type BillingInterval = "monthly" | "yearly";

export type PricingPlan = {
  id: string;
  name: string;
  summary: string;
  /** Null means contact-for-pricing (preferred until commercial approval). */
  examplePrice: {
    amountLabel: string;
    interval: BillingInterval;
    currencyNote: string;
  } | null;
  highlights: readonly string[];
  cta: { href: string; label: string };
  emphasized?: boolean;
};

export const pricingPage = {
  heading: "Pricing",
  lead: "Plan shapes below are configurable examples for product conversations. They are not confirmed commercial prices. Talk with us to match capacity, campuses, and support to your institution.",
  notice:
    "Example pricing only — replace with approved commercial terms before marketing live offers.",
} as const;

export const pricingPlans: readonly PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    summary: "For a single campus beginning structured digital operations.",
    examplePrice: {
      amountLabel: "Contact",
      interval: "monthly",
      currencyNote: "Example tier — quote on request",
    },
    highlights: [
      "One school workspace",
      "Owner and administrator seats",
      "Core administration modules as they ship",
      "Email support during onboarding",
    ],
    cta: { href: "/register-school", label: "Register your school" },
  },
  {
    id: "growth",
    name: "Growth",
    summary:
      "For schools expanding campuses, staff roles, and reporting needs.",
    examplePrice: {
      amountLabel: "Contact",
      interval: "monthly",
      currencyNote: "Example tier — quote on request",
    },
    highlights: [
      "Multi-campus structure",
      "Extended role set",
      "Priority onboarding guidance",
      "Reporting as modules become available",
    ],
    cta: { href: "/demo", label: "Request a demo" },
    emphasized: true,
  },
  {
    id: "institution",
    name: "Institution",
    summary:
      "For larger networks needing tailored limits and operational support.",
    examplePrice: null,
    highlights: [
      "Custom campus and seat limits",
      "Coordinated rollout planning",
      "Manual subscription management",
      "Named operator contact",
    ],
    cta: { href: "/contact", label: "Contact sales" },
  },
] as const;
