import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeAuditMetadata } from "@/features/platform/audit/sanitize";

export type RecordAuditInput = {
  organizationId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  outcome?: "success" | "failure" | "denied";
};

/**
 * Appends a sanitized audit event via record_audit_event RPC.
 * Actor is forced to auth.uid() in the database; never pass secrets in metadata.
 */
export async function recordAuditEvent(
  supabase: SupabaseClient,
  input: RecordAuditInput,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc("record_audit_event", {
    p_organization_id: input.organizationId,
    p_action: input.action,
    p_target_type: input.targetType,
    p_target_id: input.targetId ?? null,
    p_metadata: sanitizeAuditMetadata(input.metadata),
    p_outcome: input.outcome ?? "success",
  });

  if (error || !data) {
    return { ok: false, message: "Could not record audit event." };
  }

  return { ok: true, id: String(data) };
}
