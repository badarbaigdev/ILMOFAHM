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
  { id: "school-profile-heading", label: "Profile" },
  { id: "school-branding-heading", label: "Branding" },
  { id: "school-locale-heading", label: "Locale" },
  { id: "school-campuses-heading", label: "Campuses" },
] as const;

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolSettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
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
        className="mx-auto w-full max-w-3xl px-6 py-16 outline-none sm:px-10"
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
        Settings · {active.school.name}
      </h1>
      <p className="mt-3 text-muted">
        Update school profile, branding, locale, and campuses after setup.
      </p>
      <div className="mt-4 text-sm">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          Back to school home
        </Link>
      </div>

      <PageSectionNav sections={[...SETTINGS_SECTIONS]} />

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
    </main>
  );
}
