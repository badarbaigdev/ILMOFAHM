import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PeekedSchoolInvitation = {
  email: string;
  schoolName: string;
  status: string;
};

export async function peekSchoolInvitation(
  token: string,
): Promise<PeekedSchoolInvitation | null> {
  const trimmed = token.trim();
  if (trimmed.length < 32) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("peek_school_invitation", {
    p_token: trimmed,
  });

  if (error) return null;

  const row = (Array.isArray(data) ? data[0] : data) as {
    invitation_email?: string;
    school_name?: string;
    invitation_status?: string;
  } | null;

  if (!row?.invitation_email || !row.school_name) return null;

  return {
    email: row.invitation_email,
    schoolName: row.school_name,
    status: row.invitation_status ?? "pending",
  };
}
