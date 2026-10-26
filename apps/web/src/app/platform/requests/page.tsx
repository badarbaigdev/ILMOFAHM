import { SubTabs } from "@/components/ui/sub-tabs";
import { listSchoolApplications } from "@/features/school-applications/queries";
import {
  isSchoolApplicationStatus,
  schoolApplicationStatusLabel,
  type SchoolApplicationStatus,
} from "@/features/school-applications/transitions";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { PlatformRequestsTable } from "@/features/platform/ui/platform-lists";

const FILTERS: Array<{ value: "all" | SchoolApplicationStatus; label: string }> =
  [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "under_review", label: "Under review" },
    { value: "information_requested", label: "Info requested" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

type SearchParams = Promise<{ status?: string }>;

export default async function PlatformRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.applications.read",
  );

  const params = await searchParams;
  const statusParam = params.status?.trim() ?? "all";
  const statusFilter: SchoolApplicationStatus | "all" =
    statusParam === "all"
      ? "all"
      : isSchoolApplicationStatus(statusParam)
        ? statusParam
        : "all";

  let allApplications;
  try {
    allApplications = await listSchoolApplications(supabase, { status: "all" });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          School requests
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school applications.
        </p>
      </main>
    );
  }

  const counts = Object.fromEntries(
    FILTERS.map((filter) => [
      filter.value,
      filter.value === "all"
        ? allApplications.length
        : allApplications.filter((a) => a.status === filter.value).length,
    ]),
  ) as Record<string, number>;

  const applications =
    statusFilter === "all"
      ? allApplications
      : allApplications.filter((a) => a.status === statusFilter);

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
        School requests
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Review public registration applications. Approval provisions a school
        through a controlled server path — not a client write.
      </p>

      <SubTabs
        label="Filter by status"
        activeId={statusFilter}
        items={FILTERS.map((filter) => ({
          id: filter.value,
          label: filter.label,
          count: counts[filter.value] ?? 0,
          href:
            filter.value === "all"
              ? "/platform/requests"
              : `/platform/requests?status=${filter.value}`,
        }))}
      />

      <div className="mt-6">
        <PlatformRequestsTable applications={applications} />
      </div>

      {statusFilter !== "all" ? (
        <p className="mt-3 text-xs text-muted">
          Showing {schoolApplicationStatusLabel(statusFilter)} requests.
        </p>
      ) : null}
    </main>
  );
}
