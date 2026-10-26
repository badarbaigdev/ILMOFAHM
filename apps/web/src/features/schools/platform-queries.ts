import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlatformSchoolRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  institutionType: string;
  city: string | null;
  email: string | null;
  createdAt: string;
  applicationId: string | null;
  defaultCampusName: string | null;
  ownerInvitationStatus: string | null;
};

export type SchoolProvisioningSnapshot = {
  schoolId: string;
  schoolStatus: string;
  schoolName: string;
  schoolSlug: string | null;
  campusId: string | null;
  campusName: string | null;
  invitationId: string | null;
  invitationStatus: string | null;
  invitationEmail: string | null;
  complete: boolean;
};

export async function listPlatformSchools(
  supabase: SupabaseClient,
): Promise<PlatformSchoolRow[]> {
  const { data: schools, error } = await supabase
    .from("schools")
    .select(
      "id, name, slug, status, institution_type, city, email, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Could not list schools.");
  }

  const rows = schools ?? [];
  if (rows.length === 0) {
    return [];
  }

  const schoolIds = rows.map((s) => s.id as string);

  const [appsRes, campusesRes, invitesRes] = await Promise.all([
    supabase
      .from("school_applications")
      .select("id, provisioned_school_id")
      .in("provisioned_school_id", schoolIds),
    supabase
      .from("school_campuses")
      .select("school_id, name")
      .in("school_id", schoolIds)
      .eq("is_default", true),
    supabase
      .from("school_invitations")
      .select("school_id, status, role, created_at")
      .in("school_id", schoolIds)
      .eq("role", "owner")
      .order("created_at", { ascending: true }),
  ]);

  if (appsRes.error || campusesRes.error || invitesRes.error) {
    throw new Error("Could not load school provisioning details.");
  }

  const appBySchool = new Map<string, string>();
  for (const app of appsRes.data ?? []) {
    if (app.provisioned_school_id) {
      appBySchool.set(
        app.provisioned_school_id as string,
        app.id as string,
      );
    }
  }

  const campusBySchool = new Map<string, string>();
  for (const campus of campusesRes.data ?? []) {
    campusBySchool.set(campus.school_id as string, campus.name as string);
  }

  const inviteBySchool = new Map<string, string>();
  for (const invite of invitesRes.data ?? []) {
    const sid = invite.school_id as string;
    if (!inviteBySchool.has(sid)) {
      inviteBySchool.set(sid, invite.status as string);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string | null) ?? null,
    status: row.status as string,
    institutionType: row.institution_type as string,
    city: (row.city as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    createdAt: row.created_at as string,
    applicationId: appBySchool.get(row.id as string) ?? null,
    defaultCampusName: campusBySchool.get(row.id as string) ?? null,
    ownerInvitationStatus: inviteBySchool.get(row.id as string) ?? null,
  }));
}

export async function countPlatformSchools(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("schools")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message || "Could not count schools.");
  }
  return count ?? 0;
}

export async function getSchoolProvisioningSnapshot(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolProvisioningSnapshot | null> {
  const { data: school, error } = await supabase
    .from("schools")
    .select("id, name, slug, status")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load school.");
  }
  if (!school) {
    return null;
  }

  const [{ data: campus }, { data: invite }] = await Promise.all([
    supabase
      .from("school_campuses")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("is_default", true)
      .maybeSingle(),
    supabase
      .from("school_invitations")
      .select("id, status, email")
      .eq("school_id", schoolId)
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const complete = Boolean(campus?.id && invite?.id);

  return {
    schoolId: school.id as string,
    schoolStatus: school.status as string,
    schoolName: school.name as string,
    schoolSlug: (school.slug as string | null) ?? null,
    campusId: (campus?.id as string | undefined) ?? null,
    campusName: (campus?.name as string | undefined) ?? null,
    invitationId: (invite?.id as string | undefined) ?? null,
    invitationStatus: (invite?.status as string | undefined) ?? null,
    invitationEmail: (invite?.email as string | undefined) ?? null,
    complete,
  };
}
