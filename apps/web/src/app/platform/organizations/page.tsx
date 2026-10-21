import Link from "next/link";

import { listPlatformOrganizations } from "@/features/platform/operator/queries";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { institutionTypeLabel, isInstitutionType } from "@/features/institution/mode";

export default async function PlatformOrganizationsPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.organizations.read",
  );

  let organizations;
  try {
    organizations = await listPlatformOrganizations(supabase);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Organizations
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load organizations.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Organizations
        </h1>
        <Link
          href="/platform/organizations/new"
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white no-underline"
        >
          Create organization
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        All registered institutions. Each organization has its own admin
        (owner) and isolated tenant data.
      </p>

      {organizations.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No organizations yet.{" "}
          <Link
            href="/platform/organizations/new"
            className="text-ink-soft underline"
          >
            Create the first one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
          {organizations.map((org) => (
            <li key={org.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-ink">{org.name}</h2>
                <span className="text-xs tracking-wide text-muted uppercase">
                  {org.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {isInstitutionType(org.institutionType)
                  ? institutionTypeLabel(org.institutionType)
                  : org.institutionType}
                {org.slug ? ` · ${org.slug}` : ""}
                {org.ownerFullName
                  ? ` · admin ${org.ownerFullName}`
                  : " · no owner assigned"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted">{org.id}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
