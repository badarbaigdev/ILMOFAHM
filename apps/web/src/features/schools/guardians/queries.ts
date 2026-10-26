import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolGuardianRow = {
  id: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
};

export type SchoolStudentGuardianRow = {
  id: string;
  schoolId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
  status: string;
};

export async function listSchoolGuardians(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolGuardianRow[]> {
  const { data, error } = await supabase
    .from("school_guardians")
    .select("id, school_id, first_name, last_name, email, phone, status")
    .eq("school_id", schoolId)
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error("Could not load guardians.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
  }));
}

export async function listSchoolStudentGuardians(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolStudentGuardianRow[]> {
  const { data, error } = await supabase
    .from("school_student_guardians")
    .select(
      "id, school_id, student_id, guardian_id, relationship, is_primary, status",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Could not load guardian links.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    guardianId: row.guardian_id,
    relationship: row.relationship,
    isPrimary: row.is_primary,
    status: row.status,
  }));
}
