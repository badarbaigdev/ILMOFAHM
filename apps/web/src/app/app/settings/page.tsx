import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandingPanel } from "@/features/institution/branding/branding-panel";
import { CalendarPanel } from "@/features/institution/calendar/calendar-panel";
import { listOrganizationHolidays } from "@/features/institution/calendar/queries";
import { CampusesPanel } from "@/features/institution/campuses/campuses-panel";
import { listOrganizationCampuses } from "@/features/institution/campuses/queries";
import { OrganizationProfileForm } from "@/features/institution/profile/profile-form";
import { getOrganizationProfile } from "@/features/institution/profile/queries";
import {
  authorize,
  can,
  createSupabaseAuthorizationDeps,
  isAuthorizationError,
} from "@/features/platform/authorization";
import { ContextSelector } from "@/features/platform/context";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{ organization?: string; campus?: string }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app/settings");
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
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Settings
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load organization settings.
        </p>
      </main>
    );
  }

  if (!context) {
    redirect("/app/onboarding");
  }

  const deps = createSupabaseAuthorizationDeps(supabase, { user });

  try {
    await authorize(
      {
        organizationId: context.organization.id,
        permission: "organization.read",
      },
      deps,
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
            Settings
          </h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            {authError.message}
          </p>
        </main>
      );
    }
    throw authError;
  }

  const [canUpdate, canManageCampuses] = await Promise.all([
    can(
      {
        organizationId: context.organization.id,
        permission: "organization.update",
      },
      deps,
    ),
    can(
      {
        organizationId: context.organization.id,
        permission: "campus.manage",
      },
      deps,
    ),
  ]);

  let profile;
  let campuses;
  let holidays;
  try {
    [profile, campuses, holidays] = await Promise.all([
      getOrganizationProfile(supabase, context.organization.id),
      listOrganizationCampuses(supabase, context.organization.id),
      listOrganizationHolidays(supabase, context.organization.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Settings
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load organization settings.
        </p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Settings
        </h1>
        <p role="status" className="mt-4 text-sm text-muted">
          No organization profile is available for this context.
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
          href={`/app?organization=${context.organization.id}`}
          className="text-ink-soft underline"
        >
          Back to workspace
        </Link>
      </p>
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">
        Settings
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Institution profile, branding, locale, calendar, and campuses for{" "}
        <span className="font-medium text-ink">{profile.name}</span>.
      </p>

      <div className="mt-8">
        <ContextSelector
          organizations={context.organizations}
          campuses={context.allCampuses}
          organizationId={context.organization.id}
          campusId={context.campus?.id ?? null}
          returnTo="/app/settings"
        />
      </div>

      <OrganizationProfileForm
        organizationId={profile.id}
        name={profile.name}
        slug={profile.slug}
        institutionType={profile.institutionType}
        status={profile.status}
        canUpdate={canUpdate}
      />

      <BrandingPanel
        organizationId={profile.id}
        organizationName={profile.name}
        contactEmail={profile.contactEmail}
        contactPhone={profile.contactPhone}
        websiteUrl={profile.websiteUrl}
        brandDisplayName={profile.brandDisplayName}
        brandPrimaryColor={profile.brandPrimaryColor}
        brandLogoUrl={profile.brandLogoUrl}
        campuses={campuses}
        canUpdateOrganization={canUpdate}
        canManageCampuses={canManageCampuses}
      />

      <CalendarPanel
        organizationId={profile.id}
        timezone={profile.timezone}
        locale={profile.locale}
        workingDays={profile.workingDays}
        holidays={holidays}
        canUpdate={canUpdate}
      />

      <CampusesPanel
        organizationId={profile.id}
        campuses={campuses}
        canManage={canManageCampuses}
      />
    </main>
  );
}
