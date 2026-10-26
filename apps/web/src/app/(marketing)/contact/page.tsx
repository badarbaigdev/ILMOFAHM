import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/marketing/ContactForm";
import { PageIntro } from "@/components/marketing/PageIntro";
import { contactPageContent } from "@/features/marketing/contact-content";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact the ${brand.productName} team about partnerships, support, or school onboarding.`,
};

export default function ContactPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading={contactPageContent.heading}
        lead={contactPageContent.lead}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <ContactForm />

        <aside className="space-y-8">
          <section aria-labelledby="contact-channels-heading">
            <h2
              id="contact-channels-heading"
              className="font-display text-xl tracking-tight text-ink"
            >
              How we can help
            </h2>
            <ul className="mt-4 space-y-5">
              {contactPageContent.channels.map((channel) => (
                <li key={channel.title} className="border-t border-line pt-4">
                  <h3 className="text-sm font-semibold text-ink">
                    {channel.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{channel.body}</p>
                  {channel.actionHref && channel.actionLabel ? (
                    <p className="mt-2 text-sm">
                      <Link
                        href={channel.actionHref}
                        className="font-medium text-teal underline-offset-2 hover:underline"
                      >
                        {channel.actionLabel}
                      </Link>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="contact-office-heading"
            className="rounded-xl border border-line bg-paper-elevated/70 p-5"
          >
            <h2
              id="contact-office-heading"
              className="text-sm font-semibold tracking-wide text-ink uppercase"
            >
              {contactPageContent.office.title}
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {contactPageContent.office.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
