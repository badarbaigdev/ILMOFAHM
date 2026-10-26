import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseRow = {
  id: string;
  organizationId: string;
  campusId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
};

export type CohortRow = {
  id: string;
  organizationId: string;
  courseId: string;
  campusId: string | null;
  academicYearId: string | null;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  capacity: number | null;
  status: string;
};

export async function listCourses(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, organization_id, campus_id, name, code, description, status")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw new Error("Could not load courses.");

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    campusId: row.campus_id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
  }));
}

export async function listCohorts(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CohortRow[]> {
  const { data, error } = await supabase
    .from("cohorts")
    .select(
      "id, organization_id, course_id, campus_id, academic_year_id, name, starts_on, ends_on, capacity, status",
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw new Error("Could not load cohorts.");

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    courseId: row.course_id,
    campusId: row.campus_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    capacity: row.capacity,
    status: row.status,
  }));
}
