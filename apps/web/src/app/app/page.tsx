import Link from "next/link";
import { redirect } from "next/navigation";

import {
  institutionTypeLabel,
  isInstitutionType,
  supportsAcademy,
  supportsSchool,
} from "@/features/institution/mode";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppHomePageProps = {
  searchParams: Promise<{ organization?: string; campus?: string }>;
};

const areas = [
  {
    href: "/app/setup",
    title: "Academic setup",
    body: "Years, terms, grades or courses — by institution type.",
  },
  {
    href: "/app/settings",
    title: "Organization settings",
    body: "Profile, branding, locale, holidays, and campuses.",
  },
  {
    href: "/app/members",
    title: "Members",
    body: "Invitations and membership status for this institution.",
  },
  {
    href: "/app/audit",
    title: "Audit log",
    body: "Configuration and membership changes with actor and time.",
  },
] as const;

/**
 * Protected workspace home. Context selector is preference only — not authorization.
 */
export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

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
        className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Workspace
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load your workspace context. Please try again shortly.
        </p>
      </main>
    );
  }

  if (!context) {
    redirect("/app/onboarding");
  }

  const orgId = context.organization.id;
  const rawType = context.organization.institutionType;
  const institutionType = isInstitutionType(rawType) ? rawType : "school";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Workspace
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink sm:text-5xl">
        {context.organization.name}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Signed in
        {profile?.full_name ? ` as ${profile.full_name}` : ""}
        {" · "}
        {institutionTypeLabel(institutionType)}
        {" · role "}
        {context.organization.role}
        {context.campus ? ` · ${context.campus.name}` : ""}
      </p>

      <section aria-labelledby="context-heading" className="mt-10">
        <h2
          id="context-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Active context
        </h2>
        <div className="mt-4">
          <ContextSelector
            organizations={context.organizations}
            campuses={context.allCampuses}
            organizationId={context.organization.id}
            campusId={context.campus?.id ?? null}
            returnTo="/app"
          />
        </div>
        {context.ignoredInvalidSelection ? (
          <p className="mt-2 text-sm text-muted">
            An invalid organization or campus selection was ignored.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted">
          {supportsSchool(institutionType) && supportsAcademy(institutionType)
            ? "School and academy setup panels are both available."
            : supportsSchool(institutionType)
              ? "School setup is available; academy courses stay hidden."
              : "Academy setup is available; school grades stay hidden."}
        </p>
      </section>

      <section aria-labelledby="areas-heading" className="mt-12">
        <h2
          id="areas-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Go to
        </h2>
        <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
          {areas.map((area) => (
            <li key={area.href}>
              <Link
                href={`${area.href}?organization=${orgId}`}
                className="group flex flex-col gap-1 py-5 no-underline sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
              >
                <span className="font-display text-xl text-ink group-hover:text-teal">
                  {area.title}
                </span>
                <span className="max-w-md text-sm text-muted sm:text-right">
                  {area.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          <Link
            href="/app/onboarding"
            className="text-ink-soft underline-offset-2 hover:underline"
          >
            Create another organization
          </Link>
        </p>
      </section>
    </main>
  );
}
