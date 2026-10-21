import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorize,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { listOrganizationAuditEvents } from "@/features/platform/audit/queries";
import { listActiveMemberships } from "@/features/platform/onboarding/memberships";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AuditPageProps = {
  searchParams: Promise<{ organization?: string }>;
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

  let memberships;
  try {
    memberships = await listActiveMemberships(supabase, user.id);
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

  if (memberships.length === 0) {
    redirect("/app/onboarding");
  }

  const selected =
    memberships.find((m) => m.organizationId === params.organization) ??
    memberships[0];

  try {
    await authorize(
      {
        organizationId: selected.organizationId,
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
              href={`/app?organization=${selected.organizationId}`}
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

  let events;
  try {
    events = await listOrganizationAuditEvents(
      supabase,
      selected.organizationId,
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
      className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/app?organization=${selected.organizationId}`}
          className="underline"
        >
          Workspace
        </Link>
        {" · "}
        <Link
          href={`/app/members?organization=${selected.organizationId}`}
          className="underline"
        >
          Members
        </Link>
      </p>

      <h1 className="mt-6 font-display text-4xl tracking-tight text-ink">
        Audit log
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Privileged actions for {selected.organizationName}. Entries are
        append-only; secrets and tokens are never stored.
      </p>

      {events.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No audit events yet.</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {events.map((event) => (
            <li key={event.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-ink">{event.action}</p>
                <p className="text-xs text-muted">
                  {new Date(event.createdAt).toLocaleString()}
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
              {Object.keys(event.metadata).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-paper-elevated p-2 font-mono text-xs text-ink-soft">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
