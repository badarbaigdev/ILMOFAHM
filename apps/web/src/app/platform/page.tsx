import Link from "next/link";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { listSchoolApplications } from "@/features/school-applications/queries";
import { countPendingSchoolApplications } from "@/features/school-applications/queries";
import {
  schoolApplicationStatusLabel,
  type SchoolApplicationStatus,
} from "@/features/school-applications/transitions";
import {
  countSubscriptionsByStatus,
  listSchoolSubscriptions,
} from "@/features/platform/subscriptions/queries";
import {
  countPlatformSchools,
  listPlatformSchools,
} from "@/features/schools/platform-queries";
import {
  DonutChart,
  HorizontalBarChart,
  StatCard,
  buildSlices,
} from "@/features/platform/ui/dashboard-charts";
import { StatusBadge } from "@/features/schools/ui/data-table";

const REQUEST_ORDER: SchoolApplicationStatus[] = [
  "pending",
  "under_review",
  "information_requested",
  "approved",
  "rejected",
];

const SUB_ORDER = [
  "active",
  "trial",
  "past_due",
  "grace",
  "suspended",
  "cancelled",
  "expired",
] as const;

export default async function PlatformDashboardPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.applications.read",
  );

  let openRequests = 0;
  let schoolCount = 0;
  let schools: Awaited<ReturnType<typeof listPlatformSchools>> = [];
  let requests: Awaited<ReturnType<typeof listSchoolApplications>> = [];
  let subscriptionCounts: Record<string, number> = {};
  let attentionSubs: Awaited<ReturnType<typeof listSchoolSubscriptions>> = [];

  try {
    [openRequests, schoolCount, schools, requests, subscriptionCounts] =
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
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Dashboard
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load platform statistics.
        </p>
      </main>
    );
  }

  const { count: operatorCount } = await supabase
    .from("platform_operators")
    .select("user_id", { count: "exact", head: true })
    .eq("status", "active");

  const requestCounts = REQUEST_ORDER.map((status) => ({
    id: status,
    label: schoolApplicationStatusLabel(status),
    value: requests.filter((r) => r.status === status).length,
  }));

  const subscriptionSlices = buildSlices(
    SUB_ORDER.map((status) => ({
      id: status,
      label: status.replaceAll("_", " "),
      value: subscriptionCounts[status] ?? 0,
    })).filter((s) => s.value > 0),
  );

  const schoolStatusSlices = buildSlices(
    Object.entries(
      schools.reduce<Record<string, number>>((acc, school) => {
        acc[school.status] = (acc[school.status] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([status, value]) => ({
      id: status,
      label: status.replaceAll("_", " "),
      value,
    })),
  );

  const needsAttention =
    openRequests +
    (subscriptionCounts.past_due ?? 0) +
    (subscriptionCounts.grace ?? 0) +
    (subscriptionCounts.suspended ?? 0);

  const recentRequests = requests.slice(0, 5);
  const recentSchools = schools.slice(0, 5);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
            Platform
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/platform/requests?status=pending"
            className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white no-underline"
          >
            Review requests
          </Link>
          <Link
            href="/platform/subscriptions"
            className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink no-underline"
          >
            Subscriptions
          </Link>
        </div>
      </div>

      <section
        aria-label="Key metrics"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Open requests"
          value={openRequests}
          hint="Pending or in review"
          href="/platform/requests?status=pending"
          tone={openRequests > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="Schools"
          value={schoolCount}
          hint="Provisioned tenants"
          href="/platform/schools"
          tone="info"
        />
        <StatCard
          label="Active plans"
          value={subscriptionCounts.active ?? 0}
          hint={`Trials ${subscriptionCounts.trial ?? 0}`}
          href="/platform/subscriptions?status=active"
          tone="ok"
        />
        <StatCard
          label="Needs attention"
          value={needsAttention}
          hint="Requests + billing risks"
          href="/platform/subscriptions?status=past_due"
          tone={needsAttention > 0 ? "warn" : "default"}
        />
      </section>

      <section
        aria-label="Distribution charts"
        className="mt-4 grid gap-4 lg:grid-cols-2"
      >
        <HorizontalBarChart
          title="Registration pipeline"
          slices={buildSlices(requestCounts)}
          emptyLabel="No registration requests yet."
        />
        <DonutChart
          title="Subscription mix"
          slices={
            subscriptionSlices.length > 0
              ? subscriptionSlices
              : buildSlices([{ id: "none", label: "None", value: 0 }])
          }
          centerLabel="Current"
          emptyLabel="No current subscriptions."
        />
      </section>

      <section
        aria-label="Schools and activity"
        className="mt-4 grid gap-4 lg:grid-cols-3"
      >
        <div className="lg:col-span-1">
          <DonutChart
            title="School status"
            slices={schoolStatusSlices}
            centerLabel="Schools"
            emptyLabel="No schools provisioned."
          />
        </div>

        <section className="rounded-2xl border border-line bg-paper-elevated p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Needs action</h2>
            <span className="text-xs text-muted">
              {attentionSubs.length + openRequests} items
            </span>
          </div>

          {attentionSubs.length === 0 && openRequests === 0 ? (
            <p className="mt-8 text-sm text-muted">
              Nothing urgent — pipeline and billing look clear.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line/70">
              {openRequests > 0 ? (
                <li className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {openRequests} open registration
                      {openRequests === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-muted">
                      Waiting for review or more information
                    </p>
                  </div>
                  <Link
                    href="/platform/requests"
                    className="shrink-0 text-sm text-teal no-underline hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ) : null}
              {attentionSubs.slice(0, 6).map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {sub.schoolName}
                    </p>
                    <p className="truncate text-xs text-muted">{sub.planName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={sub.status} />
                    <Link
                      href={`/platform/subscriptions/${sub.id}`}
                      className="text-sm text-teal no-underline hover:underline"
                    >
                      Fix
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <section
        aria-label="Recent activity"
        className="mt-4 grid gap-4 lg:grid-cols-2"
      >
        <section className="rounded-2xl border border-line bg-paper-elevated p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Latest requests</h2>
            <Link
              href="/platform/requests"
              className="text-xs text-teal no-underline hover:underline"
            >
              View all
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No applications yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentRequests.map((app) => (
                <li key={app.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/platform/requests/${app.id}`}
                      className="truncate text-sm font-medium text-ink no-underline hover:underline"
                    >
                      {app.schoolName}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {app.applicantEmail}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-paper-elevated p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Latest schools</h2>
            <Link
              href="/platform/schools"
              className="text-xs text-teal no-underline hover:underline"
            >
              View all
            </Link>
          </div>
          {recentSchools.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              Approve a request to provision the first school.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentSchools.map((school) => (
                <li
                  key={school.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {school.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {school.slug ?? school.city ?? school.id.slice(0, 8)}
                    </p>
                  </div>
                  <StatusBadge status={school.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <p className="mt-6 text-xs text-muted">
        {operatorCount ?? 0} active operator
        {(operatorCount ?? 0) === 1 ? "" : "s"} · Platform console stays above
        school student data.
      </p>
    </main>
  );
}
