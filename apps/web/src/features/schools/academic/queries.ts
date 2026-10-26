import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolAcademicYearRow = {
  id: string;
  schoolId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: string;
  isCurrent: boolean;
};

export type SchoolAcademicTermRow = {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  sortOrder: number;
};

export type SchoolGradeRow = {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  sortOrder: number;
  status: string;
};

export type SchoolSectionRow = {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  capacity: number | null;
  status: string;
};

export type SchoolSubjectRow = {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  status: string;
};

export async function listSchoolAcademicYears(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolAcademicYearRow[]> {
  const { data, error } = await supabase
    .from("school_academic_years")
    .select("id, school_id, name, starts_on, ends_on, status, is_current")
    .eq("school_id", schoolId)
    .order("starts_on", { ascending: false });

  if (error) {
    throw new Error("Could not load academic years.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    isCurrent: row.is_current,
  }));
}

export async function listSchoolAcademicTerms(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolAcademicTermRow[]> {
  const { data, error } = await supabase
    .from("school_academic_terms")
    .select(
      "id, school_id, academic_year_id, name, starts_on, ends_on, sort_order",
    )
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Could not load academic terms.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    sortOrder: row.sort_order,
  }));
}

export async function listSchoolGrades(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolGradeRow[]> {
  const { data, error } = await supabase
    .from("school_grades")
    .select("id, school_id, name, code, sort_order, status")
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Could not load grades.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    code: row.code,
    sortOrder: row.sort_order,
    status: row.status,
  }));
}

export async function listSchoolSections(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolSectionRow[]> {
  const { data, error } = await supabase
    .from("school_sections")
    .select("id, school_id, grade_id, name, capacity, status")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load sections.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    gradeId: row.grade_id,
    name: row.name,
    capacity: row.capacity,
    status: row.status,
  }));
}

export async function listSchoolSubjects(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolSubjectRow[]> {
  const { data, error } = await supabase
    .from("school_subjects")
    .select("id, school_id, name, code, status")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load subjects.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    code: row.code,
    status: row.status,
  }));
}
