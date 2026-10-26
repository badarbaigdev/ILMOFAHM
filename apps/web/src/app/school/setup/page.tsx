import Link from "next/link";
import { redirect } from "next/navigation";

import { PageSectionNav } from "@/components/shell/PageSectionNav";
import {
  loadSchoolContext,
  listSchoolHolidays,
  type SchoolHolidayRecord,
} from "@/features/schools/context";
import {
  CompleteSchoolSetupPanel,
  SchoolBrandingPanel,
  SchoolCampusesPanel,
  SchoolLocalePanel,
  SchoolProfilePanel,
} from "@/features/schools/setup/setup-panels";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SETUP_SECTIONS = [
  { id: "school-profile-heading", label: "Profile" },
  { id: "school-branding-heading", label: "Branding" },
  { id: "school-locale-heading", label: "Locale" },
  { id: "school-campuses-heading", label: "Campuses" },
  { id: "complete-setup-heading", label: "Complete" },
] as const;

type PageProps = {
  searchParams: Promise<{ school?: string; setPassword?: string }>;
};

export default async function SchoolSetupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/setup?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/setup";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const promptPassword =
    params.setPassword === "1" ||
    Boolean(user.user_metadata?.must_set_password);

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
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          School setup
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school setup.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          School setup
        </h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership before setup. Accept a school
          invitation first.
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/auth/accept-school-invite"
            className="text-ink underline-offset-2 hover:underline"
          >
            Accept school invite
          </Link>
        </p>
      </main>
    );
  }

  const { active } = loaded;
  let holidays: SchoolHolidayRecord[] = [];
  try {
    holidays = await listSchoolHolidays(supabase, active.school.id);
  } catch {
    holidays = [];
  }

  const hasActiveCampus = active.campuses.some((c) => c.status === "active");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        School portal
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Setup · {active.school.name}
      </h1>
      <p className="mt-3 text-muted">
        Finish profile, branding, locale, and campuses, then mark setup
        complete to activate this school.
      </p>
      <p className="mt-2 text-sm text-muted">
        Status: {active.school.status.replaceAll("_", " ")} · Role:{" "}
        {active.membership.role}
      </p>
      {promptPassword ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          You entered via an approval link.{" "}
          <Link
            href="/auth/update-password"
            className="font-medium underline-offset-2 hover:underline"
          >
            Set a password
          </Link>{" "}
          so you can sign in again later.
        </p>
      ) : null}
      <div className="mt-4 text-sm">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Back to school home
        </Link>
      </div>

      <PageSectionNav sections={[...SETUP_SECTIONS]} />

      <SchoolProfilePanel school={active.school} canManage={active.canManage} />
      <SchoolBrandingPanel school={active.school} canManage={active.canManage} />
      <SchoolLocalePanel
        school={active.school}
        holidays={holidays}
        canManage={active.canManage}
      />
      <SchoolCampusesPanel
        schoolId={active.school.id}
        campuses={active.campuses}
        canManage={active.canManage}
      />
      <CompleteSchoolSetupPanel
        schoolId={active.school.id}
        canManage={active.canManage}
        needsSetup={active.needsSetup}
        hasActiveCampus={hasActiveCampus}
      />
    </main>
  );
}
