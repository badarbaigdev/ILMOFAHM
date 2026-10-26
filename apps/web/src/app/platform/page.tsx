import Link from "next/link";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { listSchoolApplications } from "@/features/school-applications/queries";
import { countPendingSchoolApplications } from "@/features/school-applications/queries";
import { schoolApplicationStatusLabel } from "@/features/school-applications/transitions";
import {
  countSubscriptionsByStatus,
  listSchoolSubscriptions,
} from "@/features/platform/subscriptions/queries";
import {
  countPlatformSchools,
  listPlatformSchools,
} from "@/features/schools/platform-queries";

export default async function PlatformDashboardPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.applications.read",
  );

  let openRequests = 0;
  let schoolCount = 0;
  let recentSchools: Awaited<ReturnType<typeof listPlatformSchools>> = [];
  let recentRequests: Awaited<ReturnType<typeof listSchoolApplications>> = [];
  let subscriptionCounts: Record<string, number> = {};
  let attentionSubs: Awaited<ReturnType<typeof listSchoolSubscriptions>> = [];

  try {
    [openRequests, schoolCount, recentSchools, recentRequests, subscriptionCounts] =
      await Promise.all([
        countPendingSchoolApplications(supabase),
        countPlatformSchools(supabase),
        listPlatformSchools(supabase),
        listSchoolApplications(supabase, { status: "all" }),
        countSubscriptionsByStatus(supabase),
      ]);
    attentionSubs = (
      await listSchoolSubscriptions(supabase, { currentOnly: true })
    ).filter((s) =>
      ["trial", "past_due", "grace", "suspended"].includes(s.status),
    );
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

  const schoolsPreview = recentSchools.slice(0, 8);
  const requestsPreview = recentRequests.slice(0, 8);

  const { count: operatorCount } = await supabase
    .from("platform_operators")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "active");

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
        Review school registration requests, manage provisioned tenants, and
        record manual SaaS subscriptions. This console does not open student
        records without a separate approved support path.
      </p>

      <section aria-labelledby="stats-heading" className="mt-10">
        <h2
          id="stats-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Overview
        </h2>
        <dl className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              Schools
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {schoolCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Active subscriptions
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {subscriptionCounts.active ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Operators
            </dt>
            <dd className="mt-1 font-display text-3xl text-ink">
              {operatorCount ?? 0}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Trials {subscriptionCounts.trial ?? 0} · Past due{" "}
          {subscriptionCounts.past_due ?? 0} · Suspended{" "}
          {subscriptionCounts.suspended ?? 0}
        </p>
      </section>

      <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href="/platform/requests"
          className="font-medium text-teal underline-offset-2 hover:underline"
        >
          Review school requests
        </Link>
        <Link
          href="/platform/subscriptions"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Subscriptions
        </Link>
        <Link
          href="/platform/plans"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Plans
        </Link>
        <Link
          href="/platform/schools"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          View schools
        </Link>
        <Link
          href="/platform/operators"
          className="font-medium text-ink underline-offset-2 hover:underline"
        >
          Manage operators
        </Link>
      </p>

      {attentionSubs.length > 0 ? (
        <section aria-labelledby="billing-attention-heading" className="mt-12">
          <h2
            id="billing-attention-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Subscription attention
          </h2>
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {attentionSubs.slice(0, 8).map((sub) => (
              <li
                key={sub.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-ink">
                    <Link
                      href={`/platform/subscriptions/${sub.id}`}
                      className="text-ink no-underline hover:underline"
                    >
                      {sub.schoolName}
                    </Link>
                  </p>
                  <p className="text-sm text-muted">{sub.planName}</p>
                </div>
                <p className="text-xs tracking-wide text-muted uppercase">
                  {sub.status.replaceAll("_", " ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="requests-heading" className="mt-12">
        <h2
          id="requests-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Recent school requests
        </h2>
        {requestsPreview.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No school applications yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {requestsPreview.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-ink">
                    <Link
                      href={`/platform/requests/${app.id}`}
                      className="text-ink no-underline hover:underline"
                    >
                      {app.schoolName}
                    </Link>
                  </p>
                  <p className="text-sm text-muted">
                    {app.applicantEmail}
                    {app.city ? ` · ${app.city}` : ""}
                  </p>
                </div>
                <p className="text-xs tracking-wide text-muted uppercase">
                  {schoolApplicationStatusLabel(app.status)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="schools-heading" className="mt-12">
        <h2
          id="schools-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Recent schools
        </h2>
        {schoolsPreview.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No schools provisioned yet. Approve a request to create the first
            one.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {schoolsPreview.map((school) => (
              <li
                key={school.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-ink">{school.name}</p>
                  <p className="text-sm text-muted">
                    {school.institutionType} ·{" "}
                    {school.status.replaceAll("_", " ")}
                    {school.city ? ` · ${school.city}` : ""}
                  </p>
                </div>
                <p className="font-mono text-xs text-muted">{school.slug}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
