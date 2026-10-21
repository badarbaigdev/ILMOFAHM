import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type GradeRow = {
  id: string;
  organizationId: string;
  campusId: string | null;
  name: string;
  code: string | null;
  sortOrder: number;
  status: string;
};

export type SectionRow = {
  id: string;
  organizationId: string;
  gradeId: string;
  campusId: string | null;
  name: string;
  capacity: number | null;
  status: string;
};

export type SubjectRow = {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  status: string;
};

export async function listGrades(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GradeRow[]> {
  const { data, error } = await supabase
    .from("grades")
    .select("id, organization_id, campus_id, name, code, sort_order, status")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Could not load grades.");

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    campusId: row.campus_id,
    name: row.name,
    code: row.code,
    sortOrder: row.sort_order,
    status: row.status,
  }));
}

export async function listSections(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SectionRow[]> {
  const { data, error } = await supabase
    .from("sections")
    .select(
      "id, organization_id, grade_id, campus_id, name, capacity, status",
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw new Error("Could not load sections.");

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    gradeId: row.grade_id,
    campusId: row.campus_id,
    name: row.name,
    capacity: row.capacity,
    status: row.status,
  }));
}

export async function listSubjects(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SubjectRow[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, organization_id, name, code, status")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw new Error("Could not load subjects.");

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    status: row.status,
  }));
}
