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
    .select("id, name, slug, institution_type, status, timezone, locale")
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

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    institutionType: data.institution_type,
    status: data.status,
    timezone: data.timezone,
    locale: data.locale,
  };
}
