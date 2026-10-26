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
      "id, school_id, student_number, first_name, last_name, date_of_birth, gender, status",
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
  }));
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
