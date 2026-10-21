import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/marketing/PageIntro";
import { RegisterSchoolForm } from "@/components/marketing/RegisterSchoolForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Register your school",
  description: `Apply to bring your school onto ${brand.productName}. Applications are reviewed by platform administrators before provisioning.`,
};

export default function RegisterSchoolPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 outline-none sm:px-10"
    >
      <PageIntro
        heading="Register your school"
        lead="Submit the details we need to review your institution. Approval and secure provisioning are handled by authorized platform operators — this page does not create an active school yet."
      />
      <div className="mt-12">
        <RegisterSchoolForm />
      </div>
      <p className="mx-auto mt-10 max-w-xl text-sm text-muted">
        Prefer a conversation first?{" "}
        <Link
          href="/demo"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Request a demo
        </Link>{" "}
        or{" "}
        <Link
          href="/contact"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          contact us
        </Link>
        .
      </p>
    </main>
  );
}
