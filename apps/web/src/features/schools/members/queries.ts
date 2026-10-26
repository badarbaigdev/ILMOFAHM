import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolMemberRow = {
  id: string;
  schoolId: string;
  userId: string;
  role: string;
  status: string;
  fullName: string | null;
  email: string | null;
};

export type SchoolPendingInviteRow = {
  id: string;
  schoolId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export async function listSchoolMembers(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolMemberRow[]> {
  const { data, error } = await supabase
    .from("school_memberships")
    .select("id, school_id, user_id, role, status, profiles(full_name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load school members.");
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: String(row.id),
      schoolId: String(row.school_id),
      userId: String(row.user_id),
      role: String(row.role),
      status: String(row.status),
      fullName: profile?.full_name == null ? null : String(profile.full_name),
      email: null,
    };
  });
}

export async function listPendingSchoolInvitations(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolPendingInviteRow[]> {
  const { data, error } = await supabase
    .from("school_invitations")
    .select("id, school_id, email, role, status, expires_at, created_at")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not load school invitations.");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    schoolId: String(row.school_id),
    email: String(row.email),
    role: String(row.role),
    status: String(row.status),
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  }));
}
