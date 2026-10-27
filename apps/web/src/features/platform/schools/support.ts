import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolSupportSessionRow = {
  id: string;
  schoolId: string;
  operatorUserId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
};

export async function getActiveSchoolSupportSession(
  supabase: SupabaseClient,
  schoolId: string,
  operatorUserId: string,
): Promise<SchoolSupportSessionRow | null> {
  const { data, error } = await supabase
    .from("school_support_sessions")
    .select(
      "id, school_id, operator_user_id, reason, started_at, expires_at, ended_at",
    )
    .eq("school_id", schoolId)
    .eq("operator_user_id", operatorUserId)
    .is("ended_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load support session.");
  }
  if (!data) return null;

  return {
    id: data.id,
    schoolId: data.school_id,
    operatorUserId: data.operator_user_id,
    reason: data.reason,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
    endedAt: data.ended_at,
  };
}

export async function listOpenSupportSessionsForOperator(
  supabase: SupabaseClient,
  operatorUserId: string,
): Promise<SchoolSupportSessionRow[]> {
  const { data, error } = await supabase
    .from("school_support_sessions")
    .select(
      "id, school_id, operator_user_id, reason, started_at, expires_at, ended_at",
    )
    .eq("operator_user_id", operatorUserId)
    .is("ended_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false });

  if (error) {
    throw new Error("Could not load support sessions.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    operatorUserId: row.operator_user_id,
    reason: row.reason,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at,
  }));
}
