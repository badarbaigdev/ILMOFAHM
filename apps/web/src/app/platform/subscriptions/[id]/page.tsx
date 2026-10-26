import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import {
  RecordPaymentForm,
  SetSubscriptionStatusForm,
  VoidPaymentForm,
} from "@/features/platform/subscriptions/forms";
import {
  getSchoolSubscription,
  listSubscriptionPayments,
} from "@/features/platform/subscriptions/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlatformSubscriptionDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  const { supabase } = await requirePlatformOperatorPage(
    "platform.subscriptions.manage",
  );

  let subscription;
  let payments;
  try {
    subscription = await getSchoolSubscription(supabase, id);
    if (!subscription) {
      notFound();
    }
    payments = await listSubscriptionPayments(supabase, id);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Subscription
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load subscription details.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-sm">
        <Link
          href="/platform/subscriptions"
          className="text-ink underline-offset-2 hover:underline"
        >
          ← Subscriptions
        </Link>
      </p>
      <p className="mt-6 text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Manual SaaS billing
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        {subscription.schoolName}
      </h1>
      <p className="mt-3 text-muted">
        {subscription.planName} · {subscription.status.replaceAll("_", " ")} ·{" "}
        {subscription.billingInterval}
      </p>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Starts</dt>
          <dd className="mt-1 text-ink">
            {new Date(subscription.startsAt).toLocaleString()}
          </dd>
        </div>
        {subscription.trialEndsAt ? (
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Trial ends
            </dt>
            <dd className="mt-1 text-ink">
              {new Date(subscription.trialEndsAt).toLocaleString()}
            </dd>
          </div>
        ) : null}
        {subscription.billingContactEmail ? (
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Billing contact
            </dt>
            <dd className="mt-1 text-ink">
              {subscription.billingContactName
                ? `${subscription.billingContactName} · `
                : ""}
              {subscription.billingContactEmail}
            </dd>
          </div>
        ) : null}
        {subscription.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-xs tracking-wide text-muted uppercase">Notes</dt>
            <dd className="mt-1 text-ink">{subscription.notes}</dd>
          </div>
        ) : null}
      </dl>

      <section aria-labelledby="status-heading" className="mt-12">
        <h2
          id="status-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Update status
        </h2>
        <SetSubscriptionStatusForm
          subscriptionId={subscription.id}
          currentStatus={subscription.status}
        />
      </section>

      <section aria-labelledby="payments-heading" className="mt-12">
        <h2
          id="payments-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Manual payments
        </h2>
        <p className="mt-2 text-sm text-muted">
          Record bank/cash/cheque receipts. Void with a reason if entered in
          error. No online gateway.
        </p>

        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {payments.map((payment) => (
              <li key={payment.id} className="py-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">
                    {payment.amount.toFixed(2)} {payment.currencyCode}
                  </p>
                  <span className="text-xs tracking-wide text-muted uppercase">
                    {payment.status}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {payment.method.replaceAll("_", " ")}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                  {` · ${new Date(payment.paidAt).toLocaleDateString()}`}
                </p>
                <VoidPaymentForm
                  payment={payment}
                  subscriptionId={subscription.id}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8">
          <h3 className="text-sm font-medium text-ink">Record payment</h3>
          <RecordPaymentForm subscriptionId={subscription.id} />
        </div>
      </section>
    </main>
  );
}
