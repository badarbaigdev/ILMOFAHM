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
  photoUrl: string | null;
};

export async function listSchoolTeachers(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolTeacherRow[]> {
  const { data, error } = await supabase
    .from("school_teachers")
    .select(
      "id, school_id, staff_number, first_name, last_name, email, phone, primary_subject, status, photo_url",
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
    photoUrl: row.photo_url == null ? null : String(row.photo_url),
  }));
}

export async function getSchoolTeacher(
  supabase: SupabaseClient,
  schoolId: string,
  teacherId: string,
): Promise<SchoolTeacherRow | null> {
  const { data, error } = await supabase
    .from("school_teachers")
    .select(
      "id, school_id, staff_number, first_name, last_name, email, phone, primary_subject, status, photo_url",
    )
    .eq("school_id", schoolId)
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load teacher.");
  }
  if (!data) return null;

  return {
    id: data.id,
    schoolId: data.school_id,
    staffNumber: data.staff_number,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    primarySubject: data.primary_subject,
    status: data.status,
    photoUrl: data.photo_url == null ? null : String(data.photo_url),
  };
}
