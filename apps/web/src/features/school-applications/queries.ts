import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isSchoolApplicationStatus,
  type SchoolApplicationStatus,
} from "@/features/school-applications/transitions";

export type SchoolApplicationListItem = {
  id: string;
  schoolName: string;
  applicantName: string;
  applicantEmail: string;
  city: string | null;
  institutionType: string;
  status: SchoolApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  provisionedSchoolId: string | null;
};

export type SchoolApplicationDetail = SchoolApplicationListItem & {
  phone: string | null;
  region: string | null;
  countryCode: string;
  requestedPlanId: string | null;
  message: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  informationRequest: string | null;
  reviewerUserId: string | null;
  provisionedAt: string | null;
  updatedAt: string;
};

function mapStatus(raw: string): SchoolApplicationStatus {
  if (isSchoolApplicationStatus(raw)) {
    return raw;
  }
  return "pending";
}

export async function listSchoolApplications(
  supabase: SupabaseClient,
  options?: { status?: SchoolApplicationStatus | "all" },
): Promise<SchoolApplicationListItem[]> {
  let query = supabase
    .from("school_applications")
    .select(
      "id, school_name, applicant_name, applicant_email, city, institution_type, status, created_at, reviewed_at, provisioned_school_id",
    )
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Could not list school applications.");
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    schoolName: row.school_name as string,
    applicantName: row.applicant_name as string,
    applicantEmail: row.applicant_email as string,
    city: (row.city as string | null) ?? null,
    institutionType: row.institution_type as string,
    status: mapStatus(row.status as string),
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    provisionedSchoolId: (row.provisioned_school_id as string | null) ?? null,
  }));
}

export async function getSchoolApplication(
  supabase: SupabaseClient,
  id: string,
): Promise<SchoolApplicationDetail | null> {
  const { data, error } = await supabase
    .from("school_applications")
    .select(
      "id, school_name, applicant_name, applicant_email, phone, city, region, country_code, institution_type, requested_plan_id, message, status, review_notes, rejection_reason, information_request, reviewer_user_id, provisioned_school_id, reviewed_at, provisioned_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load school application.");
  }
  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    schoolName: data.school_name as string,
    applicantName: data.applicant_name as string,
    applicantEmail: data.applicant_email as string,
    phone: (data.phone as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    region: (data.region as string | null) ?? null,
    countryCode: data.country_code as string,
    institutionType: data.institution_type as string,
    requestedPlanId: (data.requested_plan_id as string | null) ?? null,
    message: (data.message as string | null) ?? null,
    status: mapStatus(data.status as string),
    reviewNotes: (data.review_notes as string | null) ?? null,
    rejectionReason: (data.rejection_reason as string | null) ?? null,
    informationRequest: (data.information_request as string | null) ?? null,
    reviewerUserId: (data.reviewer_user_id as string | null) ?? null,
    provisionedSchoolId: (data.provisioned_school_id as string | null) ?? null,
    reviewedAt: (data.reviewed_at as string | null) ?? null,
    provisionedAt: (data.provisioned_at as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function countPendingSchoolApplications(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("school_applications")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "under_review", "information_requested"]);

  if (error) {
    throw new Error(error.message || "Could not count applications.");
  }
  return count ?? 0;
}
