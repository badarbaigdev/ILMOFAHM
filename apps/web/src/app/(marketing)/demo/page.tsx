import type { Metadata } from "next";

import { DemoForm } from "@/components/marketing/DemoForm";
import { PageIntro } from "@/components/marketing/PageIntro";
import { demoPageContent } from "@/features/marketing/demo-content";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Request a demo",
  description: `Request a walkthrough of ${brand.productName} for your school or academy.`,
};

export default function DemoPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading={demoPageContent.heading}
        lead={demoPageContent.lead}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <DemoForm />

        <aside className="space-y-8">
          <section
            aria-labelledby="demo-agenda-heading"
            className="rounded-xl border border-line bg-paper-elevated/70 p-5"
          >
            <h2
              id="demo-agenda-heading"
              className="font-display text-xl tracking-tight text-ink"
            >
              {demoPageContent.agenda.title}
            </h2>
            <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm">
              {demoPageContent.agenda.items.map((item) => (
                <li key={item.title} className="pl-1">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-muted">{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="demo-audience-heading">
            <h2
              id="demo-audience-heading"
              className="text-sm font-semibold tracking-wide text-ink uppercase"
            >
              {demoPageContent.audience.title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {demoPageContent.audience.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-teal">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
