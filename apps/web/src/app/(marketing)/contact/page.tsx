import type { Metadata } from "next";

import { ContactForm } from "@/components/marketing/ContactForm";
import { PageIntro } from "@/components/marketing/PageIntro";
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
        heading="Contact"
        lead="Questions about onboarding, pricing conversations, or partnerships can start here. Delivery is not connected yet — the form validates your message for the upcoming backend."
      />
      <div className="mt-12">
        <ContactForm />
      </div>
    </main>
  );
}
