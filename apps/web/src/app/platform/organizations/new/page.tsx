import Link from "next/link";

import { CreateOrganizationForm } from "@/features/platform/operator/create-organization-form";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";

export default async function PlatformCreateOrganizationPage() {
  await requirePlatformOperatorPage("platform.organizations.manage");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-sm text-muted">
        <Link
          href="/platform/organizations"
          className="text-ink-soft underline-offset-2 hover:underline"
        >
          Organizations
        </Link>
      </p>
      <p className="mt-4 text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Create organization
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Provision a tenant and assign its organization admin (owner). The admin
        will only see this organization&apos;s data after sign-in.
      </p>

      <CreateOrganizationForm />
    </main>
  );
}
