import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationHolidayRow = {
  id: string;
  organizationId: string;
  name: string;
  holidayDate: string;
};

export async function listOrganizationHolidays(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationHolidayRow[]> {
  const { data, error } = await supabase
    .from("organization_holidays")
    .select("id, organization_id, name, holiday_date")
    .eq("organization_id", organizationId)
    .order("holiday_date", { ascending: true });

  if (error) {
    throw new Error("Could not load holidays.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    holidayDate: row.holiday_date,
  }));
}
