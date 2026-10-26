import { PageSectionNav } from "@/components/shell/PageSectionNav";
import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import {
  previewCampuses,
  previewHolidays,
  previewSchool,
} from "@/features/schools/ui-preview/fixtures";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import {
  SchoolBrandingPanel,
  SchoolCampusesPanel,
  SchoolLocalePanel,
  SchoolProfilePanel,
} from "@/features/schools/setup/setup-panels";

const SETTINGS_SECTIONS = [
  { id: "school-profile-heading", label: "Profile" },
  { id: "school-branding-heading", label: "Branding" },
  { id: "school-locale-heading", label: "Locale" },
  { id: "school-campuses-heading", label: "Campuses" },
] as const;

export const metadata = {
  title: "School settings · UI preview",
};

export default function SchoolSettingsUiPreviewPage() {
  assertUiPreviewAllowed();
  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/settings"
      title={`Settings · ${previewSchool.name}`}
      breadcrumbs={["Dashboard", "Settings"]}
    >
      <p className="mb-4 text-sm text-muted">
        Update school profile, branding, locale, and campuses after setup.
      </p>
      <PageSectionNav sections={[...SETTINGS_SECTIONS]} />
      <SchoolProfilePanel school={previewSchool} canManage />
      <SchoolBrandingPanel school={previewSchool} canManage />
      <SchoolLocalePanel
        school={previewSchool}
        holidays={previewHolidays}
        canManage
      />
      <SchoolCampusesPanel
        schoolId={previewSchool.id}
        campuses={previewCampuses}
        canManage
      />
    </SchoolAdminPreviewShell>
  );
}
