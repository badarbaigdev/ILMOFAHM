import Link from "next/link";
import { redirect } from "next/navigation";

import { PageSectionNav } from "@/components/shell/PageSectionNav";
import {
  loadSchoolContext,
  listSchoolHolidays,
  type SchoolHolidayRecord,
} from "@/features/schools/context";
import {
  SchoolBrandingPanel,
  SchoolCampusesPanel,
  SchoolLocalePanel,
  SchoolProfilePanel,
} from "@/features/schools/setup/setup-panels";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SETTINGS_SECTIONS = [
  { id: "profile", label: "General", headingId: "school-profile-heading" },
  { id: "branding", label: "Customize", headingId: "school-branding-heading" },
  { id: "locale", label: "Localization", headingId: "school-locale-heading" },
  { id: "campuses", label: "Campuses", headingId: "school-campuses-heading" },
] as const;

type PageProps = {
  searchParams: Promise<{ school?: string; section?: string }>;
};

export default async function SchoolSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const sectionParam = params.section?.trim() ?? "profile";
  const activeSection = SETTINGS_SECTIONS.some((s) => s.id === sectionParam)
    ? sectionParam
    : "profile";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/settings?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/settings";
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
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          School settings
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load school settings.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    redirect("/school");
  }

  const { active } = loaded;

  if (active.needsSetup && active.canManage) {
    redirect(`/school/setup?school=${active.school.id}`);
  }

  let holidays: SchoolHolidayRecord[] = [];
  try {
    holidays = await listSchoolHolidays(supabase, active.school.id);
  } catch {
    holidays = [];
  }

  const schoolQuery = `school=${encodeURIComponent(active.school.id)}`;
  const activeMeta =
    SETTINGS_SECTIONS.find((s) => s.id === activeSection) ??
    SETTINGS_SECTIONS[0];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          {active.school.name}
        </Link>
        <span className="mx-1.5 text-line">/</span>
        Settings
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted">
        Update school profile, branding, locale, and campuses after setup.
      </p>

      <PageSectionNav
        label="Settings sections"
        variant="pill"
        activeId={activeSection}
        sections={SETTINGS_SECTIONS.map((s) => ({
          id: s.id,
          label: s.label,
        }))}
        hrefFor={(id) => `/school/settings?${schoolQuery}&section=${id}`}
      />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">{activeMeta.label}</h2>
        {activeSection === "profile" ? (
          <SchoolProfilePanel
            school={active.school}
            canManage={active.canManage}
          />
        ) : null}
        {activeSection === "branding" ? (
          <SchoolBrandingPanel
            school={active.school}
            canManage={active.canManage}
          />
        ) : null}
        {activeSection === "locale" ? (
          <SchoolLocalePanel
            school={active.school}
            holidays={holidays}
            canManage={active.canManage}
          />
        ) : null}
        {activeSection === "campuses" ? (
          <SchoolCampusesPanel
            schoolId={active.school.id}
            campuses={active.campuses}
            canManage={active.canManage}
          />
        ) : null}
      </div>
    </main>
  );
}
