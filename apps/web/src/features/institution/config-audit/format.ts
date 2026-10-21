/**
 * Extracts before/after snapshots and effective time from config audit metadata.
 */

export type ConfigChangeSnapshot = {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  /** ISO timestamp when the change took effect (immediate unless scheduled). */
  effectiveAt: string | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function extractConfigChangeSnapshot(
  metadata: Record<string, unknown>,
  createdAt: string,
): ConfigChangeSnapshot {
  const before = asObject(metadata.before);
  const after = asObject(metadata.after);
  const effectiveRaw = metadata.effective_at;
  const effectiveAt =
    typeof effectiveRaw === "string" && effectiveRaw.length > 0
      ? effectiveRaw
      : createdAt;

  return { before, after, effectiveAt };
}

export function summarizeConfigFields(
  snapshot: Record<string, unknown> | null,
): string {
  if (!snapshot) {
    return "—";
  }
  const parts = Object.entries(snapshot).map(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return `${key}: (empty)`;
    }
    if (Array.isArray(value)) {
      return `${key}: [${value.join(", ")}]`;
    }
    if (typeof value === "object") {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${String(value)}`;
  });
  return parts.length > 0 ? parts.join(" · ") : "—";
}
