import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PasswordRecoveryRequestRow = {
  id: string;
  schoolId: string;
  schoolName: string;
  membershipId: string | null;
  requesterUserId: string | null;
  requesterEmail: string;
  requesterRole: string | null;
  reason: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  recoveryIssuedAt: string | null;
  createdAt: string;
};

export async function listPasswordRecoveryRequests(
  supabase: SupabaseClient,
  options?: { status?: string; schoolId?: string },
): Promise<PasswordRecoveryRequestRow[]> {
  let query = supabase
    .from("school_password_recovery_requests")
    .select(
      "id, school_id, membership_id, requester_user_id, requester_email, requester_role, reason, status, reviewed_by, reviewed_at, review_note, recovery_issued_at, created_at, schools(name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  if (options?.schoolId) {
    query = query.eq("school_id", options.schoolId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load password recovery requests.");
  }

  return (data ?? []).map((row) => {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    return {
      id: String(row.id),
      schoolId: String(row.school_id),
      schoolName: school?.name ? String(school.name) : "School",
      membershipId: row.membership_id == null ? null : String(row.membership_id),
      requesterUserId:
        row.requester_user_id == null ? null : String(row.requester_user_id),
      requesterEmail: String(row.requester_email),
      requesterRole:
        row.requester_role == null ? null : String(row.requester_role),
      reason: String(row.reason),
      status: String(row.status),
      reviewedBy: row.reviewed_by == null ? null : String(row.reviewed_by),
      reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
      reviewNote: row.review_note == null ? null : String(row.review_note),
      recoveryIssuedAt:
        row.recovery_issued_at == null
          ? null
          : String(row.recovery_issued_at),
      createdAt: String(row.created_at),
    };
  });
}

export async function countPendingPasswordRecoveryRequests(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("school_password_recovery_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) {
    throw new Error("Could not count recovery requests.");
  }
  return count ?? 0;
}
