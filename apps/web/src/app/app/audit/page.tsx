import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CONFIG_AUDIT_ACTIONS,
  configAuditActionLabel,
  isConfigAuditAction,
} from "@/features/institution/config-audit/catalog";
import {
  extractConfigChangeSnapshot,
  summarizeConfigFields,
} from "@/features/institution/config-audit/format";
import { listOrganizationAuditEvents } from "@/features/platform/audit/queries";
import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AuditPageProps = {
  searchParams: Promise<{
    organization?: string;
    campus?: string;
    category?: string;
  }>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app/audit");
  }

  let context;
  try {
    context = await loadWorkspaceContext(supabase, user.id, {
      organizationId: params.organization,
      campusId: params.campus,
    });
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">Audit</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load organizations.
        </p>
      </main>
    );
  }

  if (!context) {
    redirect("/app/onboarding");
  }

  try {
    await authorize(
      {
        organizationId: context.organization.id,
        permission: "audit.read",
      },
      createSupabaseAuthorizationDeps(supabase, { user }),
    );
  } catch (authError) {
    if (isAuthorizationError(authError)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
        >
          <h1 className="font-display text-4xl tracking-tight text-ink">
            Audit
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            {authError.message}
          </p>
          <p className="mt-4 text-sm">
            <Link
              href={`/app?organization=${context.organization.id}`}
              className="text-ink-soft underline"
            >
              Back to workspace
            </Link>
          </p>
        </main>
      );
    }
    throw authError;
  }

  const configOnly = params.category === "config";

  let events;
  try {
    events = await listOrganizationAuditEvents(
      supabase,
      context.organization.id,
      configOnly ? { limit: 50, actions: CONFIG_AUDIT_ACTIONS } : { limit: 50 },
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">Audit</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load audit events.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Compliance
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        {configOnly ? "Configuration audit" : "Audit log"}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {configOnly
          ? `Institution settings changes for ${context.organization.name}, with editor role, effective time, and before/after values.`
          : `Privileged actions for ${context.organization.name}. Entries are append-only; secrets and tokens are never stored.`}
      </p>

      <div className="mt-8">
        <ContextSelector
          organizations={context.organizations}
          campuses={context.allCampuses}
          organizationId={context.organization.id}
          campusId={context.campus?.id ?? null}
          returnTo={configOnly ? "/app/audit?category=config" : "/app/audit"}
        />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          href={`/app/audit?organization=${context.organization.id}`}
          className={
            configOnly ? "text-ink-soft underline" : "font-medium text-ink"
          }
        >
          All events
        </Link>
        <Link
          href={`/app/audit?organization=${context.organization.id}&category=config`}
          className={
            configOnly ? "font-medium text-ink" : "text-ink-soft underline"
          }
        >
          Configuration only
        </Link>
      </p>

      {events.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          {configOnly
            ? "No configuration changes recorded yet."
            : "No audit events yet."}
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {events.map((event) => {
            const showConfigDetail =
              configOnly || isConfigAuditAction(event.action);
            const snapshot = showConfigDetail
              ? extractConfigChangeSnapshot(event.metadata, event.createdAt)
              : null;

            return (
              <li key={event.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">
                    {showConfigDetail
                      ? configAuditActionLabel(event.action)
                      : event.action}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(
                      snapshot?.effectiveAt ?? event.createdAt,
                    ).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {event.outcome}
                  {event.actorRole ? ` · actor role ${event.actorRole}` : null}
                  {" · "}
                  {event.targetType}
                  {event.targetId ? (
                    <span className="font-mono text-xs"> {event.targetId}</span>
                  ) : null}
                </p>
                {snapshot && (snapshot.before || snapshot.after) ? (
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
    </main>
  );
}
