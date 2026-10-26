import Link from "next/link";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { AssignSubscriptionForm } from "@/features/platform/subscriptions/forms";
import {
  listSchoolSubscriptions,
  listSubscriptionPlans,
} from "@/features/platform/subscriptions/queries";
import { listPlatformSchools } from "@/features/schools/platform-queries";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PlatformSubscriptionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const statusFilter = params.status?.trim() || "all";
  const { supabase } = await requirePlatformOperatorPage(
    "platform.subscriptions.read",
  );

  let subscriptions;
  let plans;
  let schools;
  try {
    [subscriptions, plans, schools] = await Promise.all([
      listSchoolSubscriptions(supabase, {
        currentOnly: true,
        status: statusFilter,
      }),
      listSubscriptionPlans(supabase),
      listPlatformSchools(supabase),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Subscriptions
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load subscriptions.
        </p>
      </main>
    );
  }

  const filters = [
    "all",
    "trial",
    "active",
    "past_due",
    "grace",
    "suspended",
    "cancelled",
    "expired",
  ] as const;

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
        Subscriptions
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Manual SaaS subscription management for school tenants. Payments are
        recorded by operators — there is no payment gateway in this phase.
      </p>

      <nav aria-label="Subscription status filters" className="mt-8">
        <ul className="flex flex-wrap gap-3 text-sm">
          {filters.map((status) => {
            const href =
              status === "all"
                ? "/platform/subscriptions"
                : `/platform/subscriptions?status=${status}`;
            const active = statusFilter === status;
            return (
              <li key={status}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "font-medium text-ink underline"
                      : "text-muted underline-offset-2 hover:text-ink hover:underline"
                  }
                >
                  {status.replaceAll("_", " ")}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {subscriptions.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No current subscriptions match this filter. Assign one below, or
          provision a school to create a trial automatically.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-ink">
                  <Link
                    href={`/platform/subscriptions/${sub.id}`}
                    className="text-ink no-underline hover:underline"
                  >
                    {sub.schoolName}
                  </Link>
                </h2>
                <span className="text-xs tracking-wide text-muted uppercase">
                  {sub.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {sub.planName} · {sub.billingInterval}
                {sub.billingContactEmail
                  ? ` · ${sub.billingContactEmail}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="assign-heading" className="mt-14">
        <h2
          id="assign-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Assign or replace subscription
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Creates a new current subscription row and marks any previous current
          row as historical.
        </p>
        <AssignSubscriptionForm
          schools={schools.map((s) => ({ id: s.id, name: s.name }))}
          plans={plans}
        />
      </section>
    </main>
  );
}
