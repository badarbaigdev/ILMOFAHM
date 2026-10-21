import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/marketing/PageIntro";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/marketing/form-styles";
import { pricingPage, pricingPlans } from "@/features/marketing/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Illustrative ILMOFAHM plan shapes. Contact for confirmed commercial pricing.",
};

export default function PricingPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading={pricingPage.heading}
        lead={pricingPage.lead}
        notice={pricingPage.notice}
      />

      <ul className="mt-14 grid gap-6 lg:grid-cols-3">
        {pricingPlans.map((plan) => (
          <li
            key={plan.id}
            className={[
              "flex flex-col border bg-paper-elevated/55 px-6 py-7",
              plan.emphasized
                ? "border-ink/40 shadow-[0_0_0_1px_rgba(11,31,51,0.08)]"
                : "border-line",
            ].join(" ")}
          >
            <h2 className="font-display text-2xl text-ink">{plan.name}</h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {plan.summary}
            </p>
            <p className="mt-6 text-lg font-medium text-ink">
              {plan.examplePrice
                ? plan.examplePrice.amountLabel
                : "Contact for pricing"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {plan.examplePrice
                ? plan.examplePrice.currencyNote
                : "Custom institutional quote"}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-soft">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-teal">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.cta.href}
              className={[
                "mt-8",
                plan.emphasized ? primaryButtonClass : secondaryButtonClass,
              ].join(" ")}
            >
              {plan.cta.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
