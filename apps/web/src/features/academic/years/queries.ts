import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AcademicYearRow = {
  id: string;
  organizationId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: string;
  isCurrent: boolean;
};

export type AcademicTermRow = {
  id: string;
  organizationId: string;
  academicYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  sortOrder: number;
};

export async function listAcademicYears(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<AcademicYearRow[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, organization_id, name, starts_on, ends_on, status, is_current")
    .eq("organization_id", organizationId)
    .order("starts_on", { ascending: false });

  if (error) {
    throw new Error("Could not load academic years.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    isCurrent: row.is_current,
  }));
}

export async function listAcademicTermsForYear(
  supabase: SupabaseClient,
  academicYearId: string,
): Promise<AcademicTermRow[]> {
  const { data, error } = await supabase
    .from("academic_terms")
    .select(
      "id, organization_id, academic_year_id, name, starts_on, ends_on, sort_order",
    )
    .eq("academic_year_id", academicYearId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Could not load academic terms.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    sortOrder: row.sort_order,
  }));
}

export async function listAcademicTermsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<AcademicTermRow[]> {
  const { data, error } = await supabase
    .from("academic_terms")
    .select(
      "id, organization_id, academic_year_id, name, starts_on, ends_on, sort_order",
    )
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error("Could not load academic terms.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    academicYearId: row.academic_year_id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    sortOrder: row.sort_order,
  }));
}
