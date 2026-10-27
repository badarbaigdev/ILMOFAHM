import { SubTabs } from "@/components/ui/sub-tabs";
import { SchoolAcademicPanel } from "@/features/schools/academic/academic-panel";
import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import {
  previewAcademicTerms,
  previewAcademicYears,
  previewGrades,
  previewSchool,
  previewSections,
  previewSubjects,
} from "@/features/schools/ui-preview/fixtures";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "grades", label: "Grades" },
  { id: "years", label: "Years" },
  { id: "subjects", label: "Subjects" },
  { id: "links", label: "Workflows" },
] as const;

export const metadata = {
  title: "School academic · UI preview",
};

export default function SchoolAcademicUiPreviewPage() {
  assertUiPreviewAllowed();
  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/academic"
      title="Classes"
      breadcrumbs={["Dashboard", "Classes"]}
    >
      <p className="mb-2 max-w-2xl text-sm text-muted">
        Years, grades, sections, and subjects for {previewSchool.name}.
      </p>
      <SubTabs
        label="Classes sections"
        activeId="grades"
        items={SECTIONS.map((section) => ({
          id: section.id,
          label: section.label,
          href: `#${section.id}`,
        }))}
      />
      <div className="mt-6">
        <SchoolAcademicPanel
          schoolId={previewSchool.id}
          years={previewAcademicYears}
          terms={previewAcademicTerms}
          grades={previewGrades}
          sections={previewSections}
          subjects={previewSubjects}
          enrolments={[]}
          canManage
          supportsSchoolStructure
          activeSection="grades"
        />
      </div>
    </SchoolAdminPreviewShell>
  );
}
