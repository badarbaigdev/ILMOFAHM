import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { listSubscriptionPlans } from "@/features/platform/subscriptions/queries";

export default async function PlatformPlansPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.subscriptions.read",
  );

  let plans;
  try {
    plans = await listSubscriptionPlans(supabase);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">Plans</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load subscription plans.
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
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Subscription plans
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        ILMOFAHM SaaS plan catalog. Example amounts are illustrative — not
        payment-gateway prices. Student fee plans are separate and not managed
        here.
      </p>

      <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
        {plans.map((plan) => (
          <li key={plan.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl text-ink">{plan.name}</h2>
              <span className="text-xs tracking-wide text-muted uppercase">
                {plan.isActive ? "active" : "inactive"}
                {plan.isPublic ? " · public" : " · private"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{plan.summary}</p>
            <p className="mt-2 font-mono text-xs text-muted">
              {plan.id} · {plan.billingInterval}
              {plan.exampleAmount != null
                ? ` · ${plan.exampleAmount} ${plan.currencyCode}`
                : " · contact for pricing"}
            </p>
            {plan.highlights.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {plan.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
