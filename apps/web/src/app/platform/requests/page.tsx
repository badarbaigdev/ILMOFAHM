import Link from "next/link";

import { listSchoolApplications } from "@/features/school-applications/queries";
import {
  isSchoolApplicationStatus,
  schoolApplicationStatusLabel,
  type SchoolApplicationStatus,
} from "@/features/school-applications/transitions";
import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import {
  institutionTypeLabel,
  isInstitutionType,
} from "@/features/institution/mode";

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

  let applications;
  try {
    applications = await listSchoolApplications(supabase, {
      status: statusFilter,
    });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          School requests
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school applications.
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
        School requests
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Review public registration applications. Approval provisions a school
        through a controlled server path — not a client write.
      </p>

      <nav aria-label="Filter by status" className="mt-8">
        <ul className="flex flex-wrap gap-2 text-sm">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            const href =
              filter.value === "all"
                ? "/platform/requests"
                : `/platform/requests?status=${filter.value}`;
            return (
              <li key={filter.value}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "rounded-md bg-ink px-2.5 py-1.5 font-medium text-paper-elevated no-underline"
                      : "rounded-md px-2.5 py-1.5 text-ink-soft no-underline hover:bg-line/60 hover:text-ink"
                  }
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {applications.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No applications
          {statusFilter !== "all"
            ? ` with status “${schoolApplicationStatusLabel(statusFilter)}”`
            : ""}
          .
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
          {applications.map((app) => (
            <li key={app.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-ink">
                  <Link
                    href={`/platform/requests/${app.id}`}
                    className="text-ink no-underline hover:underline"
                  >
                    {app.schoolName}
                  </Link>
                </h2>
                <span className="text-xs tracking-wide text-muted uppercase">
                  {schoolApplicationStatusLabel(app.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {app.applicantName} · {app.applicantEmail}
                {app.city ? ` · ${app.city}` : ""}
                {" · "}
                {isInstitutionType(app.institutionType)
                  ? institutionTypeLabel(app.institutionType)
                  : app.institutionType}
              </p>
              <p className="mt-1 text-xs text-muted">
                Submitted{" "}
                {new Date(app.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
