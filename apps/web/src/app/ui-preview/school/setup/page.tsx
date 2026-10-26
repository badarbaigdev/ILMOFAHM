import { PageSectionNav } from "@/components/shell/PageSectionNav";
import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import {
  previewCampuses,
  previewHolidays,
  previewSchoolPendingSetup,
} from "@/features/schools/ui-preview/fixtures";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import {
  CompleteSchoolSetupPanel,
  SchoolBrandingPanel,
  SchoolCampusesPanel,
  SchoolLocalePanel,
  SchoolProfilePanel,
} from "@/features/schools/setup/setup-panels";

const SETUP_SECTIONS = [
  { id: "school-profile-heading", label: "Profile" },
  { id: "school-branding-heading", label: "Branding" },
  { id: "school-locale-heading", label: "Locale" },
  { id: "school-campuses-heading", label: "Campuses" },
  { id: "complete-setup-heading", label: "Complete" },
] as const;

export const metadata = {
  title: "School setup · UI preview",
};

export default function SchoolSetupUiPreviewPage() {
  assertUiPreviewAllowed();
  const school = previewSchoolPendingSetup;
  const hasActiveCampus = previewCampuses.some((c) => c.status === "active");

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/setup"
      title={`Setup · ${school.name}`}
      breadcrumbs={["Dashboard", "Setup checklist"]}
    >
      <p className="mb-2 text-sm text-muted">
        Finish profile, branding, locale, and campuses, then mark setup complete.
      </p>
      <p className="mb-4 text-sm text-muted">
        Status: {school.status.replaceAll("_", " ")} · Role: owner
      </p>
      <PageSectionNav sections={[...SETUP_SECTIONS]} />
      <SchoolProfilePanel school={school} canManage />
      <SchoolBrandingPanel school={school} canManage />
      <SchoolLocalePanel school={school} holidays={previewHolidays} canManage />
      <SchoolCampusesPanel
        schoolId={school.id}
        campuses={previewCampuses}
        canManage
      />
      <CompleteSchoolSetupPanel
        schoolId={school.id}
        canManage
        needsSetup
        hasActiveCampus={hasActiveCampus}
      />
    </SchoolAdminPreviewShell>
  );
}
