import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEventRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  actorUserId: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ListAuditEventsOptions = {
  limit?: number;
  /** When set, only return rows whose action is in this list. */
  actions?: readonly string[];
};

/**
 * Lists recent audit events for an organization.
 * Caller must authorize `audit.read` first — this only queries under RLS.
 */
export async function listOrganizationAuditEvents(
  supabase: SupabaseClient,
  organizationId: string,
  options: ListAuditEventsOptions | number = 50,
): Promise<AuditEventRow[]> {
  const opts: ListAuditEventsOptions =
    typeof options === "number" ? { limit: options } : options;
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

  let query = supabase
    .from("audit_events")
    .select(
      "id, action, target_type, target_id, outcome, actor_user_id, actor_role, metadata, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.actions && opts.actions.length > 0) {
    query = query.in("action", [...opts.actions]);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Could not load audit events.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    outcome: row.outcome,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  }));
}
