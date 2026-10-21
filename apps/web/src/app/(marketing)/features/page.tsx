import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/marketing/PageIntro";
import { primaryButtonClass } from "@/components/marketing/form-styles";
import { featuresContent, marketingCta } from "@/features/marketing/content";

export const metadata: Metadata = {
  title: "Features",
  description:
    "School administration, academics, attendance, fees, reporting, and multi-school SaaS architecture planned for ILMOFAHM.",
};

export default function FeaturesPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading={featuresContent.heading}
        lead={featuresContent.lead}
      />

      <div className="mt-14 space-y-14">
        {featuresContent.groups.map((group) => (
          <section
            key={group.title}
            aria-labelledby={`${group.title.replace(/\s+/g, "-").toLowerCase()}-heading`}
          >
            <h2
              id={`${group.title.replace(/\s+/g, "-").toLowerCase()}-heading`}
              className="font-display text-2xl tracking-tight text-ink sm:text-3xl"
            >
              {group.title}
            </h2>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {group.items.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10"
                >
                  <div className="max-w-3xl">
                    <h3 className="text-base font-medium text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {item.body}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold tracking-wide text-teal uppercase">
                    {featuresContent.availabilityLabels[item.availability]}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-line pt-10">
        <Link href={marketingCta.register.href} className={primaryButtonClass}>
          {marketingCta.register.label}
        </Link>
        <Link
          href="/pricing"
          className="text-sm font-semibold text-ink underline-offset-2 hover:underline"
        >
          View pricing examples
        </Link>
      </div>
    </main>
  );
}
