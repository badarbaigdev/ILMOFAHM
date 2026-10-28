import Link from "next/link";

import { SubTabs } from "@/components/ui/sub-tabs";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { PasswordRecoveryPanel } from "@/features/platform/password-recovery/recovery-panel";
import { listPasswordRecoveryRequests } from "@/features/platform/password-recovery/queries";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function PlatformPasswordRecoveryPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const statusParam = params.status?.trim() || "pending";
  const { supabase } = await requirePlatformOperatorPage(
    "platform.schools.manage_members",
  );

  let requests;
  try {
    requests = await listPasswordRecoveryRequests(supabase, {
      status: statusParam,
    });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Password recovery
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load recovery requests.
        </p>
      </main>
    );
  }

  const tabs = [
    { id: "pending", label: "Pending" },
    { id: "fulfilled", label: "Fulfilled" },
    { id: "denied", label: "Denied" },
    { id: "all", label: "All" },
  ] as const;

  const activeId = tabs.some((t) => t.id === statusParam)
    ? statusParam
    : "pending";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Password recovery
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Review school admin recovery requests, verify identity, then issue a
            one-time reset link through an approved channel.
          </p>
        </div>
        <Link
          href="/platform/schools"
          className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink no-underline"
        >
          Schools
        </Link>
      </div>

      <SubTabs
        label="Recovery filters"
        activeId={activeId}
        items={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          href: `/platform/password-recovery?status=${tab.id}`,
        }))}
      />

      <div className="mt-8">
        <PasswordRecoveryPanel requests={requests} />
      </div>
    </main>
  );
}
