import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolStudentRow = {
  id: string;
  schoolId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  status: string;
  photoUrl: string | null;
};

export type SchoolEnrolmentRow = {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string | null;
  status: string;
  enrolledOn: string;
};

export async function listSchoolStudents(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolStudentRow[]> {
  const { data, error } = await supabase
    .from("school_students")
    .select(
      "id, school_id, student_number, first_name, last_name, date_of_birth, gender, status, photo_url",
    )
    .eq("school_id", schoolId)
    .order("student_number", { ascending: true });

  if (error) {
    throw new Error("Could not load students.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentNumber: row.student_number,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    status: row.status,
    photoUrl: row.photo_url == null ? null : String(row.photo_url),
  }));
}

export async function getSchoolStudent(
  supabase: SupabaseClient,
  schoolId: string,
  studentId: string,
): Promise<SchoolStudentRow | null> {
  const { data, error } = await supabase
    .from("school_students")
    .select(
      "id, school_id, student_number, first_name, last_name, date_of_birth, gender, status, photo_url",
    )
    .eq("school_id", schoolId)
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load student.");
  }
  if (!data) return null;

  return {
    id: data.id,
    schoolId: data.school_id,
    studentNumber: data.student_number,
    firstName: data.first_name,
    lastName: data.last_name,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    status: data.status,
    photoUrl: data.photo_url == null ? null : String(data.photo_url),
  };
}

export async function listSchoolEnrolments(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolEnrolmentRow[]> {
  const { data, error } = await supabase
    .from("school_enrolments")
    .select(
      "id, school_id, student_id, academic_year_id, grade_id, section_id, status, enrolled_on",
    )
    .eq("school_id", schoolId)
    .order("enrolled_on", { ascending: false });

  if (error) {
    throw new Error("Could not load enrolments.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    academicYearId: row.academic_year_id,
    gradeId: row.grade_id,
    sectionId: row.section_id,
    status: row.status,
    enrolledOn: row.enrolled_on,
  }));
}
