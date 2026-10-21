import Link from "next/link";

import {
  secondaryButtonClass,
  primaryButtonClass,
} from "@/components/marketing/form-styles";
import {
  featuresContent,
  homeContent,
  marketingCta,
} from "@/features/marketing/content";
import { pricingPage, pricingPlans } from "@/features/marketing/pricing";

export default function HomePage() {
  const previewPlans = pricingPlans.slice(0, 2);
  const capabilityItems = featuresContent.groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      group: group.title,
    })),
  );

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_480px_at_15%_-10%,rgba(20,184,166,0.22),transparent_55%),radial-gradient(700px_420px_at_90%_10%,rgba(11,31,51,0.14),transparent_50%),linear-gradient(180deg,rgba(238,243,248,0.2),transparent_40%)]"
        />
        <div
          aria-hidden="true"
          className="marketing-grid pointer-events-none absolute inset-0 opacity-40"
        />
        <div className="relative mx-auto flex min-h-[min(92vh,44rem)] w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 sm:py-20">
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-teal uppercase">
            {homeContent.hero.eyebrow}
          </p>
          <h1 className="max-w-4xl font-display text-5xl leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            {homeContent.hero.title}
          </h1>
          <p className="mt-5 max-w-2xl font-display text-xl leading-snug text-ink-soft sm:text-2xl">
            {homeContent.hero.tagline}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            {homeContent.hero.supporting}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={marketingCta.register.href}
              className={primaryButtonClass}
            >
              {marketingCta.register.label}
            </Link>
            <Link
              href={marketingCta.demo.href}
              className={secondaryButtonClass}
            >
              {marketingCta.demo.label}
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="feature-overview-heading"
        className="border-t border-line/80"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
          <h2
            id="feature-overview-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            {homeContent.featureOverview.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {homeContent.featureOverview.lead}
          </p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuresContent.groups.map((group) => (
              <li key={group.title} className="border-t border-line pt-5">
                <h3 className="text-sm font-semibold tracking-wide text-teal uppercase">
                  {group.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-soft">
                  {group.items.map((item) => item.title).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              href="/features"
              className="text-sm font-semibold text-ink underline-offset-2 hover:underline"
            >
              Explore all features
            </Link>
          </p>
        </div>
      </section>

      <section
        aria-labelledby="capabilities-heading"
        className="border-t border-line/80 bg-paper-elevated/40"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
          <h2
            id="capabilities-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            {homeContent.capabilities.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {homeContent.capabilities.lead}
          </p>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {capabilityItems.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <div className="max-w-3xl">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-semibold tracking-wide text-teal uppercase">
                  {featuresContent.availabilityLabels[item.availability]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="benefits-heading"
        className="border-t border-line/80"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
          <h2
            id="benefits-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            {homeContent.benefits.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {homeContent.benefits.lead}
          </p>
          <ul className="mt-10 grid gap-10 md:grid-cols-3">
            {homeContent.benefits.items.map((item) => (
              <li key={item.title}>
                <h3 className="font-display text-2xl text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="pricing-preview-heading"
        className="border-t border-line/80"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
          <h2
            id="pricing-preview-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            {homeContent.pricingPreview.heading}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            {homeContent.pricingPreview.lead}
          </p>
          <p className="mt-3 text-sm text-ink-soft" role="note">
            {pricingPage.notice}
          </p>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {previewPlans.map((plan) => (
              <li
                key={plan.id}
                className="border border-line bg-paper-elevated/50 px-6 py-6"
              >
                <h3 className="font-display text-2xl text-ink">{plan.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {plan.summary}
                </p>
                <p className="mt-4 text-sm font-medium text-ink">
                  {plan.examplePrice
                    ? `${plan.examplePrice.amountLabel} · ${plan.examplePrice.currencyNote}`
                    : "Contact for pricing"}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              href={homeContent.pricingPreview.ctaHref}
              className="text-sm font-semibold text-ink underline-offset-2 hover:underline"
            >
              {homeContent.pricingPreview.ctaLabel}
            </Link>
          </p>
        </div>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="border-t border-line/80 bg-paper-elevated/40"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
          <h2
            id="faq-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            {homeContent.faq.heading}
          </h2>
          <dl className="mt-10 divide-y divide-line border-y border-line">
            {homeContent.faq.items.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="font-medium text-ink">{item.question}</dt>
                <dd className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="closing-cta-heading"
        className="border-t border-line/80"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <div className="max-w-xl">
            <h2
              id="closing-cta-heading"
              className="font-display text-3xl tracking-tight text-ink"
            >
              Ready to bring your school onto ILMOFAHM?
            </h2>
            <p className="mt-3 text-base text-muted">
              Start with a registration application. Platform review and secure
              provisioning follow in the onboarding workflow.
            </p>
          </div>
          <Link
            href={marketingCta.register.href}
            className={primaryButtonClass}
          >
            {marketingCta.register.label}
          </Link>
        </div>
      </section>
    </main>
  );
}
