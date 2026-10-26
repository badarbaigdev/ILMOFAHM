import { PageSectionNav } from "@/components/shell/PageSectionNav";
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

const ACADEMIC_SECTIONS = [
  { id: "school-academic-years-heading", label: "Years" },
  { id: "school-structure-heading", label: "Structure" },
] as const;

export const metadata = {
  title: "School academic · UI preview",
};

export default function SchoolAcademicUiPreviewPage() {
  assertUiPreviewAllowed();
  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/academic"
      title="Academic"
      breadcrumbs={["Dashboard", "Classes / academic"]}
    >
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Years, terms, grades, sections, and subjects for {previewSchool.name}.
      </p>
      <PageSectionNav sections={[...ACADEMIC_SECTIONS]} />
      <div className="mt-6">
        <SchoolAcademicPanel
          schoolId={previewSchool.id}
          years={previewAcademicYears}
          terms={previewAcademicTerms}
          grades={previewGrades}
          sections={previewSections}
          subjects={previewSubjects}
          canManage
          supportsSchoolStructure
        />
      </div>
    </SchoolAdminPreviewShell>
  );
}
