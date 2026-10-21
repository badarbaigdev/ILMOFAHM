import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type InstitutionType,
  isInstitutionType,
} from "@/features/institution/mode";

export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string | null;
  institutionType: InstitutionType;
  status: string;
  timezone: string;
  locale: string;
  workingDays: number[];
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
};

/**
 * Loads organization profile for an id the caller can SELECT under RLS.
 */
export async function getOrganizationProfile(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationProfile | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, institution_type, status, timezone, locale, working_days, contact_email, contact_phone, website_url, brand_display_name, brand_primary_color, brand_logo_url",
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load organization profile.");
  }
  if (!data) {
    return null;
  }
  if (!isInstitutionType(data.institution_type)) {
    throw new Error("Organization has an invalid institution type.");
  }

  const workingDays = Array.isArray(data.working_days)
    ? data.working_days.map((day: number | string) => Number(day))
    : [1, 2, 3, 4, 5];

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    institutionType: data.institution_type,
    status: data.status,
    timezone: data.timezone,
    locale: data.locale,
    workingDays,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    websiteUrl: data.website_url,
    brandDisplayName: data.brand_display_name,
    brandPrimaryColor: data.brand_primary_color,
    brandLogoUrl: data.brand_logo_url,
  };
}
