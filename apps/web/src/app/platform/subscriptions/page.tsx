import { SubTabs } from "@/components/ui/sub-tabs";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import {
  AssignSubscriptionButton,
  PlatformSubscriptionsTable,
} from "@/features/platform/ui/platform-lists";
import {
  listSchoolSubscriptions,
  listSubscriptionPlans,
} from "@/features/platform/subscriptions/queries";
import { listPlatformSchools } from "@/features/schools/platform-queries";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

const FILTERS = [
  "all",
  "trial",
  "active",
  "past_due",
  "grace",
  "suspended",
  "cancelled",
  "expired",
] as const;

export default async function PlatformSubscriptionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const statusFilter = (params.status?.trim() || "all") as
    | (typeof FILTERS)[number]
    | string;
  const activeFilter = FILTERS.includes(
    statusFilter as (typeof FILTERS)[number],
  )
    ? statusFilter
    : "all";

  const { supabase } = await requirePlatformOperatorPage(
    "platform.subscriptions.read",
  );

  let allSubscriptions;
  let plans;
  let schools;
  try {
    [allSubscriptions, plans, schools] = await Promise.all([
      listSchoolSubscriptions(supabase, {
        currentOnly: true,
        status: "all",
      }),
      listSubscriptionPlans(supabase),
      listPlatformSchools(supabase),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Subscriptions
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load subscriptions.
        </p>
      </main>
    );
  }

  const counts = Object.fromEntries(
    FILTERS.map((status) => [
      status,
      status === "all"
        ? allSubscriptions.length
        : allSubscriptions.filter((s) => s.status === status).length,
    ]),
  ) as Record<string, number>;

  const subscriptions =
    activeFilter === "all"
      ? allSubscriptions
      : allSubscriptions.filter((s) => s.status === activeFilter);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Subscriptions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Manual SaaS subscription management for school tenants. Payments are
            recorded by operators — there is no payment gateway in this phase.
          </p>
        </div>
        <AssignSubscriptionButton
          schools={schools.map((s) => ({ id: s.id, name: s.name }))}
          plans={plans}
        />
      </div>

      <SubTabs
        label="Subscription status"
        activeId={activeFilter}
        items={FILTERS.map((status) => ({
          id: status,
          label: status.replaceAll("_", " "),
          count: counts[status] ?? 0,
          href:
            status === "all"
              ? "/platform/subscriptions"
              : `/platform/subscriptions?status=${status}`,
        }))}
      />

      <div className="mt-6">
        <PlatformSubscriptionsTable subscriptions={subscriptions} />
      </div>
    </main>
  );
}
