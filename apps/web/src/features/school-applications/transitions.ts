/**
 * Allowed school_applications status transitions (mirrors SQL helper).
 * Approval must go through approve_school_application RPC, not review RPC.
 */

export const SCHOOL_APPLICATION_STATUSES = [
  "pending",
  "under_review",
  "information_requested",
  "approved",
  "rejected",
] as const;

export type SchoolApplicationStatus =
  (typeof SCHOOL_APPLICATION_STATUSES)[number];

const ALLOWED: Record<SchoolApplicationStatus, SchoolApplicationStatus[]> = {
  pending: ["under_review", "information_requested", "rejected", "approved"],
  under_review: [
    "information_requested",
    "rejected",
    "approved",
    "pending",
  ],
  information_requested: ["under_review", "rejected", "approved"],
  approved: [],
  rejected: ["under_review"],
};

export function isSchoolApplicationStatus(
  value: string,
): value is SchoolApplicationStatus {
  return (SCHOOL_APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function schoolApplicationTransitionAllowed(
  from: SchoolApplicationStatus,
  to: SchoolApplicationStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED[from].includes(to);
}

/** Non-approval targets the review RPC can apply from the current status. */
export function reviewTargetsFor(
  from: SchoolApplicationStatus,
): SchoolApplicationStatus[] {
  return ALLOWED[from].filter((to) => to !== "approved");
}

export function canApproveApplication(from: SchoolApplicationStatus): boolean {
  return schoolApplicationTransitionAllowed(from, "approved");
}

export function schoolApplicationStatusLabel(
  status: SchoolApplicationStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "under_review":
      return "Under review";
    case "information_requested":
      return "Information requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
  }
}
