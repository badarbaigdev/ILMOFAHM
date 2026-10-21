import type { Metadata } from "next";

import { DemoForm } from "@/components/marketing/DemoForm";
import { PageIntro } from "@/components/marketing/PageIntro";
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
        heading="Request a demo"
        lead="Tell us about your school. We will use this form to prepare a guided walkthrough once the request backend is connected."
      />
      <div className="mt-12">
        <DemoForm />
      </div>
    </main>
  );
}
