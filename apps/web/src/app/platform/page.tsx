import Link from "next/link";

import {
  getPlatformDashboardStats,
  listPlatformOrganizations,
} from "@/features/platform/operator/queries";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { countPendingSchoolApplications } from "@/features/school-applications/queries";

export default async function PlatformDashboardPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.organizations.read",
  );

  let stats;
  let recent;
  let openRequests = 0;
  try {
    [stats, recent, openRequests] = await Promise.all([
      getPlatformDashboardStats(supabase),
      listPlatformOrganizations(supabase),
      countPendingSchoolApplications(supabase).catch(() => 0),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Platform console
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load platform statistics.
        </p>
      </main>
    );
  }

  const recentOrgs = recent.slice(0, 8);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Platform console
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        System-wide organization management. This console does not open tenant
        student or academic records without a separate approved support path.
      </p>

      <section aria-labelledby="stats-heading" className="mt-10">
        <h2
          id="stats-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Overview
        </h2>
        <dl className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Open requests
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {openRequests}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Organizations
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {stats.organizationCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Active
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {stats.activeOrganizationCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Trial
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {stats.trialOrganizationCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Operators
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {stats.operatorCount}
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href="/platform/requests"
          className="font-medium text-teal underline-offset-2 hover:underline"
        >
          Review school requests
        </Link>
        <Link
          href="/platform/organizations"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Manage organizations
        </Link>
        <Link
          href="/platform/organizations/new"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Create organization
        </Link>
        <Link
          href="/platform/operators"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Manage operators
        </Link>
      </p>

      <section aria-labelledby="recent-heading" className="mt-12">
        <h2
          id="recent-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Recent organizations
        </h2>
        {recentOrgs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No organizations yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {recentOrgs.map((org) => (
              <li
                key={org.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-ink">{org.name}</p>
                  <p className="text-sm text-muted">
                    {org.institutionType} · {org.status}
                    {org.ownerFullName ? ` · owner ${org.ownerFullName}` : ""}
                  </p>
                </div>
                <p className="font-mono text-xs text-muted">{org.slug}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
