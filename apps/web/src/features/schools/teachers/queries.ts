import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolTeacherRow = {
  id: string;
  schoolId: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  primarySubject: string | null;
  status: string;
};

export async function listSchoolTeachers(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolTeacherRow[]> {
  const { data, error } = await supabase
    .from("school_teachers")
    .select(
      "id, school_id, staff_number, first_name, last_name, email, phone, primary_subject, status",
    )
    .eq("school_id", schoolId)
    .order("last_name", { ascending: true });

  if (error) {
    throw new Error("Could not load teachers.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    staffNumber: row.staff_number,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    primarySubject: row.primary_subject,
    status: row.status,
  }));
}
