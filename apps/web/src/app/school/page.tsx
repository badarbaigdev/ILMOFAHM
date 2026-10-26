import Link from "next/link";
import { redirect } from "next/navigation";

import { loadSchoolContext } from "@/features/schools/context";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

/**
 * School portal home. Managers with pending setup are sent to /school/setup.
 */
export default async function SchoolPortalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  let loaded;
  try {
    loaded = await loadSchoolContext(
      supabase,
      user.id,
      requestedSchoolId,
      hostSchoolSlug ?? undefined,
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          School portal
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load your school memberships.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          School portal
        </h1>
        <p className="mt-4 text-sm text-muted">
          You are signed in, but this account is not a school admin yet. School
          access comes only from accepting a school invitation after a platform
          operator approves a registration.
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/auth/accept-school-invite"
            className="text-ink underline-offset-2 hover:underline"
          >
            Have a school invite?
          </Link>
        </p>
      </main>
    );
  }

  const { active, memberships } = loaded;

  if (active.needsSetup && active.canManage) {
    redirect(`/school/setup?school=${active.school.id}`);
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl px-6 py-10 outline-none sm:px-8"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Dashboard
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {active.school.name}
      </h1>
      <p className="mt-3 text-muted">
        {active.needsSetup
          ? "Setup is still incomplete. Ask a school owner or admin to finish setup."
          : "Your membership is active. Use settings to manage school configuration."}
      </p>
      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Status</dt>
          <dd className="mt-1 text-ink">
            {active.school.status.replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Role</dt>
          <dd className="mt-1 text-ink">{active.membership.role}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted uppercase">Campuses</dt>
          <dd className="mt-1 text-ink">
            {active.campuses.filter((c) => c.status === "active").length} active
          </dd>
        </div>
        {active.school.setupCompletedAt ? (
          <div>
            <dt className="text-xs tracking-wide text-muted uppercase">
              Setup completed
            </dt>
            <dd className="mt-1 text-ink">
              {new Date(active.school.setupCompletedAt).toLocaleDateString()}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: `/school/students?school=${active.school.id}`, label: "Students", hint: "Records & CSV import" },
          { href: `/school/teachers?school=${active.school.id}`, label: "Teachers", hint: "HR directory" },
          { href: `/school/guardians?school=${active.school.id}`, label: "Guardians", hint: "Contacts & links" },
          { href: `/school/academic?school=${active.school.id}`, label: "Classes", hint: "Years, grades, sections" },
          { href: `/school/attendance?school=${active.school.id}`, label: "Attendance", hint: "Daily section marks" },
          { href: `/school/fees?school=${active.school.id}`, label: "Fees", hint: "Heads, charges & receipts" },
          { href: `/school/members?school=${active.school.id}`, label: "Staff & roles", hint: "Invites & access" },
          { href: `/school/settings?school=${active.school.id}`, label: "Settings", hint: "Profile & campuses" },
          ...(active.canManage
            ? [
                {
                  href: `/school/setup?school=${active.school.id}`,
                  label: "Setup",
                  hint: "Activation checklist",
                },
              ]
            : []),
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-line bg-paper-elevated p-4 no-underline transition hover:border-teal/40"
          >
            <p className="font-medium text-ink">{card.label}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>

      {memberships.length > 1 ? (
        <section className="mt-10" aria-labelledby="other-schools">
          <h2
            id="other-schools"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Your schools
          </h2>
          <ul className="mt-3 divide-y divide-line/70 border-y border-line/70">
            {memberships.map((m) => (
              <li key={m.schoolId} className="py-3 text-sm">
                <Link
                  href={`/school?school=${m.schoolId}`}
                  className="text-ink no-underline hover:underline"
                >
                  {m.school.name}
                </Link>
                <span className="text-muted"> · {m.role}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
