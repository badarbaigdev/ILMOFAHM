import type { Metadata } from "next";

import { PageIntro } from "@/components/marketing/PageIntro";
import { legalContent } from "@/features/marketing/content";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Working draft terms for the ILMOFAHM public website.",
};

export default function TermsPage() {
  const { terms } = legalContent;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading={terms.heading}
        lead={terms.disclaimer}
        notice={`Last updated ${terms.updated}`}
      />
      <div className="mt-12 space-y-10">
        {terms.sections.map((section) => {
          const headingId = section.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
          return (
            <section key={section.title} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="font-display text-2xl tracking-tight text-ink"
              >
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                {section.body}
              </p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
