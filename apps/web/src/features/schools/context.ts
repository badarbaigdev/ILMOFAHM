import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isInstitutionType,
  type InstitutionType,
} from "@/features/institution/mode";
import {
  isSchoolManagerRole,
  type SchoolRole,
} from "@/features/schools/authorization";

export type SchoolRecord = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  countryCode: string;
  institutionType: InstitutionType;
  defaultLocale: string;
  timezone: string;
  websiteUrl: string | null;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
  workingDays: number[];
  setupCompletedAt: string | null;
};

export type SchoolCampusRecord = {
  id: string;
  schoolId: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  status: "active" | "archived";
  isDefault: boolean;
};

export type SchoolContext = {
  school: SchoolRecord;
  membership: { role: SchoolRole; schoolId: string };
  campuses: SchoolCampusRecord[];
  canManage: boolean;
  needsSetup: boolean;
};

type MembershipJoinRow = {
  school_id: string;
  role: string;
  status: string;
  schools: Record<string, unknown> | Record<string, unknown>[] | null;
};

function mapSchool(row: Record<string, unknown>): SchoolRecord {
  const institutionTypeRaw = String(row.institution_type ?? "school");
  const institutionType = isInstitutionType(institutionTypeRaw)
    ? institutionTypeRaw
    : "school";

  const workingDaysRaw = row.working_days;
  const workingDays = Array.isArray(workingDaysRaw)
    ? workingDaysRaw.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7)
    : [1, 2, 3, 4, 5];

  return {
    id: String(row.id),
    name: String(row.name),
    slug: row.slug == null ? null : String(row.slug),
    status: String(row.status),
    email: row.email == null ? null : String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    addressLine1: row.address_line1 == null ? null : String(row.address_line1),
    city: row.city == null ? null : String(row.city),
    region: row.region == null ? null : String(row.region),
    countryCode: String(row.country_code ?? "PK"),
    institutionType,
    defaultLocale: String(row.default_locale ?? "en"),
    timezone: String(row.timezone ?? "Asia/Karachi"),
    websiteUrl: row.website_url == null ? null : String(row.website_url),
    brandDisplayName:
      row.brand_display_name == null ? null : String(row.brand_display_name),
    brandPrimaryColor:
      row.brand_primary_color == null ? null : String(row.brand_primary_color),
    brandLogoUrl: row.brand_logo_url == null ? null : String(row.brand_logo_url),
    workingDays,
    setupCompletedAt:
      row.setup_completed_at == null ? null : String(row.setup_completed_at),
  };
}

function mapCampus(row: Record<string, unknown>): SchoolCampusRecord {
  const statusRaw = String(row.status ?? "active");
  return {
    id: String(row.id),
    schoolId: String(row.school_id),
    name: String(row.name),
    code: row.code == null ? null : String(row.code),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    addressLine1: row.address_line1 == null ? null : String(row.address_line1),
    city: row.city == null ? null : String(row.city),
    status: statusRaw === "archived" ? "archived" : "active",
    isDefault: Boolean(row.is_default),
  };
}

/**
 * Load active school memberships and resolve the selected school context.
 * Prefer host slug (ADR-0002) over query `school=` when both are present.
 * On a school host, never fall back to another membership if the slug mismatches.
 */
export async function loadSchoolContext(
  supabase: SupabaseClient,
  userId: string,
  requestedSchoolId?: string,
  requestedSchoolSlug?: string,
): Promise<{
  memberships: Array<{
    schoolId: string;
    role: SchoolRole;
    school: SchoolRecord;
  }>;
  active: SchoolContext | null;
}> {
  const { data, error } = await supabase
    .from("school_memberships")
    .select(
      "school_id, role, status, schools(id, name, slug, status, email, phone, address_line1, city, region, country_code, institution_type, default_locale, timezone, website_url, brand_display_name, brand_primary_color, brand_logo_url, working_days, setup_completed_at)",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Could not load school memberships.");
  }

  const memberships = ((data ?? []) as MembershipJoinRow[]).flatMap((row) => {
    const schoolRaw = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    if (!schoolRaw) {
      return [];
    }
    return [
      {
        schoolId: row.school_id,
        role: row.role as SchoolRole,
        school: mapSchool(schoolRaw),
      },
    ];
  });

  if (memberships.length === 0) {
    return { memberships: [], active: null };
  }

  const slug = requestedSchoolSlug?.trim().toLowerCase() ?? "";
  let selected =
    slug.length > 0
      ? memberships.find((m) => m.school.slug?.toLowerCase() === slug)
      : undefined;

  if (slug.length > 0 && !selected) {
    // Host asserts a tenant the user is not a member of — deny active context.
    return { memberships, active: null };
  }

  selected =
    selected ??
    memberships.find((m) => m.schoolId === requestedSchoolId) ??
    memberships[0];

  const { data: campusRows, error: campusError } = await supabase
    .from("school_campuses")
    .select(
      "id, school_id, name, code, phone, email, address_line1, city, status, is_default",
    )
    .eq("school_id", selected.schoolId)
    .order("created_at", { ascending: true });

  if (campusError) {
    throw new Error("Could not load school campuses.");
  }

  const campuses = (campusRows ?? []).map((row) =>
    mapCampus(row as Record<string, unknown>),
  );
  const canManage = isSchoolManagerRole(selected.role);
  const needsSetup =
    selected.school.status === "pending_setup" ||
    selected.school.setupCompletedAt == null;

  return {
    memberships,
    active: {
      school: selected.school,
      membership: { role: selected.role, schoolId: selected.schoolId },
      campuses,
      canManage,
      needsSetup,
    },
  };
}

export type SchoolHolidayRecord = {
  id: string;
  schoolId: string;
  name: string;
  holidayDate: string;
};

export async function listSchoolHolidays(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolHolidayRecord[]> {
  const { data, error } = await supabase
    .from("school_holidays")
    .select("id, school_id, name, holiday_date")
    .eq("school_id", schoolId)
    .order("holiday_date", { ascending: true });

  if (error) {
    throw new Error("Could not load school holidays.");
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    schoolId: String(row.school_id),
    name: String(row.name),
    holidayDate: String(row.holiday_date),
  }));
}
