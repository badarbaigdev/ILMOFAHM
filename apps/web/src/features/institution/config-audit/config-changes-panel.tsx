import Link from "next/link";

import {
  configAuditActionLabel,
  isConfigAuditAction,
} from "@/features/institution/config-audit/catalog";
import {
  extractConfigChangeSnapshot,
  summarizeConfigFields,
} from "@/features/institution/config-audit/format";
import type { AuditEventRow } from "@/features/platform/audit/queries";

type ConfigChangesPanelProps = {
  organizationId: string;
  events: AuditEventRow[];
  canReadAudit: boolean;
};

export function ConfigChangesPanel({
  organizationId,
  events,
  canReadAudit,
}: ConfigChangesPanelProps) {
  if (!canReadAudit) {
    return null;
  }

  const configEvents = events.filter((event) =>
    isConfigAuditAction(event.action),
  );

  return (
    <section aria-labelledby="config-changes-heading" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="config-changes-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Configuration changes
        </h2>
        <Link
          href={`/app/audit?organization=${organizationId}&category=config`}
          className="text-sm text-ink-soft underline"
        >
          View config audit
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Recent institution settings changes with editor role, timestamp, and
        before/after values. Entries are append-only.
      </p>

      {configEvents.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted">
          No configuration changes recorded yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {configEvents.map((event) => {
            const snapshot = extractConfigChangeSnapshot(
              event.metadata,
              event.createdAt,
            );
            return (
              <li key={event.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">
                    {configAuditActionLabel(event.action)}
                  </p>
                  <p className="text-xs text-muted">
                    {snapshot.effectiveAt
                      ? new Date(snapshot.effectiveAt).toLocaleString()
                      : new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {event.actorRole
                    ? `Editor role ${event.actorRole}`
                    : "Editor"}
                  {" · "}
                  {event.outcome}
                </p>
                {snapshot.before || snapshot.after ? (
                  <dl className="mt-2 space-y-1 text-xs text-ink-soft">
                    <div>
                      <dt className="inline font-medium text-ink">Before: </dt>
                      <dd className="inline">
                        {summarizeConfigFields(snapshot.before)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-ink">After: </dt>
                      <dd className="inline">
                        {summarizeConfigFields(snapshot.after)}
                      </dd>
                    </div>
                  </dl>
                ) : Object.keys(event.metadata).length > 0 ? (
                  <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-paper-elevated p-2 font-mono text-xs text-ink-soft">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
