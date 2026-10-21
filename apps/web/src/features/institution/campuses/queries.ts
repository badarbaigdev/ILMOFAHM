import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CampusRow = {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  status: string;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
};

/**
 * Lists campuses for an organization visible under RLS.
 * Includes archived rows so managers can reactivate them.
 */
export async function listOrganizationCampuses(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<CampusRow[]> {
  const { data, error } = await supabase
    .from("campuses")
    .select(
      "id, organization_id, name, code, phone, email, address_line, status, brand_display_name, brand_primary_color, brand_logo_url",
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load campuses.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    phone: row.phone,
    email: row.email,
    addressLine: row.address_line,
    status: row.status,
    brandDisplayName: row.brand_display_name,
    brandPrimaryColor: row.brand_primary_color,
    brandLogoUrl: row.brand_logo_url,
  }));
}
