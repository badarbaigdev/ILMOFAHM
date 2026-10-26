import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { PlatformPlansTable } from "@/features/platform/ui/platform-lists";
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
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Plans</h1>
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
      className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Subscription plans
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        ILMOFAHM SaaS plan catalog. Example amounts are illustrative — not
        payment-gateway prices. Student fee plans are separate and not managed
        here.
      </p>

      <div className="mt-8">
        <PlatformPlansTable plans={plans} />
      </div>
    </main>
  );
}
