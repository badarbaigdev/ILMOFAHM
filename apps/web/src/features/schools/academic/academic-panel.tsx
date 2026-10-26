"use client";

import { useActionState, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolAcademicActionState,
  archiveSchoolGradeAction,
  createSchoolAcademicTermAction,
  createSchoolAcademicYearAction,
  createSchoolGradeAction,
  createSchoolSectionAction,
  createSchoolSubjectAction,
  updateSchoolAcademicYearAction,
} from "@/features/schools/academic/actions";
import type {
  SchoolAcademicTermRow,
  SchoolAcademicYearRow,
  SchoolGradeRow,
  SchoolSectionRow,
  SchoolSubjectRow,
} from "@/features/schools/academic/queries";

const initialState: SchoolAcademicActionState = {
  error: null,
  success: null,
};

type AcademicPanelProps = {
  schoolId: string;
  years: SchoolAcademicYearRow[];
  terms: SchoolAcademicTermRow[];
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  canManage: boolean;
  supportsSchoolStructure: boolean;
};

function CreateYearForm({ schoolId }: { schoolId: string }) {
  const [state, formAction, pending] = useActionState(
    createSchoolAcademicYearAction,
    initialState,
  );
  const dialog = useActionDialog(state);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={dialog.openDialog}
        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
      >
        + Add academic year
      </button>
      <FormDialog
        open={dialog.open}
        onClose={dialog.closeDialog}
        title="Add academic year"
        description="Define a school session with start and end dates."
        submitLabel="Create year"
        formAction={formAction}
        busy={pending}
        dirty={dialog.dirty}
        onDirtyChange={dialog.setDirty}
        error={state.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="new-school-year-name"
          name="name"
          label="Name"
          required
          placeholder="2026-27"
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="new-school-year-starts"
            name="starts_on"
            label="Starts"
            type="date"
            required
          />
          <DialogField
            id="new-school-year-ends"
            name="ends_on"
            label="Ends"
            type="date"
            required
          />
        </div>
        <DialogSelect
          id="new-school-year-status"
          name="status"
          label="Status"
          required
          defaultValue="planned"
          options={[
            { value: "planned", label: "Planned" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="make_current"
            className="rounded border-line"
          />
          Set as current year
        </label>
      </FormDialog>
    </div>
  );
}

function YearCard({
  year,
  terms,
  schoolId,
  canManage,
}: {
  year: SchoolAcademicYearRow;
  terms: SchoolAcademicTermRow[];
  schoolId: string;
  canManage: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateSchoolAcademicYearAction,
    initialState,
  );
  const [termState, termAction, termPending] = useActionState(
    createSchoolAcademicTermAction,
    initialState,
  );
  const editDialog = useActionDialog(updateState);
  const termDialog = useActionDialog(termState);

  return (
    <li className="border-t border-line/60 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-ink">
          {year.name}
          {year.isCurrent ? (
            <span className="ml-2 text-xs font-sans font-semibold tracking-wide text-teal uppercase">
              Current
            </span>
          ) : null}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            {year.startsOn} → {year.endsOn} · {year.status}
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={editDialog.openDialog}
              className="text-sm text-teal underline-offset-2 hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <FormDialog
          open={editDialog.open}
          onClose={editDialog.closeDialog}
          title={`Edit ${year.name}`}
          description="Update dates, status, or current-year flag."
          submitLabel="Save year"
          formAction={updateAction}
          busy={updatePending}
          dirty={editDialog.dirty}
          onDirtyChange={editDialog.setDirty}
          error={updateState.error}
        >
          <input type="hidden" name="academic_year_id" value={year.id} />
          <input type="hidden" name="school_id" value={schoolId} />
          <DialogField
            id={`school-year-name-${year.id}`}
            name="name"
            label="Name"
            required
            defaultValue={year.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <DialogField
              id={`school-year-starts-${year.id}`}
              name="starts_on"
              label="Starts"
              type="date"
              required
              defaultValue={year.startsOn}
            />
            <DialogField
              id={`school-year-ends-${year.id}`}
              name="ends_on"
              label="Ends"
              type="date"
              required
              defaultValue={year.endsOn}
            />
          </div>
          <DialogSelect
            id={`school-year-status-${year.id}`}
            name="status"
            label="Status"
            required
            defaultValue={year.status}
            options={[
              { value: "planned", label: "Planned" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="make_current"
              defaultChecked={year.isCurrent}
              className="rounded border-line"
            />
            Current year
          </label>
        </FormDialog>
      ) : null}

      <div className="mt-6">
        <h4 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Terms
        </h4>
        {terms.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No terms yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {terms.map((term) => (
              <li key={term.id}>
                {term.sortOrder}. {term.name} ({term.startsOn} → {term.endsOn})
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={termDialog.openDialog}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink"
            >
              + Add term
            </button>
            <FormDialog
              open={termDialog.open}
              onClose={termDialog.closeDialog}
              title="Add term"
              description={`Add a term within ${year.name}.`}
              submitLabel="Add term"
              formAction={termAction}
              busy={termPending}
              dirty={termDialog.dirty}
              onDirtyChange={termDialog.setDirty}
              error={termState.error}
            >
              <input type="hidden" name="academic_year_id" value={year.id} />
              <input type="hidden" name="school_id" value={schoolId} />
              <DialogField
                id={`school-term-name-${year.id}`}
                name="name"
                label="Term name"
                required
                placeholder="Term 1"
              />
              <div className="grid grid-cols-2 gap-3">
                <DialogField
                  id={`school-term-starts-${year.id}`}
                  name="starts_on"
                  label="Starts"
                  type="date"
                  required
                />
                <DialogField
                  id={`school-term-ends-${year.id}`}
                  name="ends_on"
                  label="Ends"
                  type="date"
                  required
                />
              </div>
              <DialogField
                id={`school-term-sort-${year.id}`}
                name="sort_order"
                label="Sort order"
                type="number"
                required
                defaultValue={String(terms.length + 1)}
              />
            </FormDialog>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function StructurePanel({
  schoolId,
  grades,
  sections,
  subjects,
  canManage,
}: {
  schoolId: string;
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  canManage: boolean;
}) {
  const [gradeState, gradeAction, gradePending] = useActionState(
    createSchoolGradeAction,
    initialState,
  );
  const [sectionState, sectionAction, sectionPending] = useActionState(
    createSchoolSectionAction,
    initialState,
  );
  const [subjectState, subjectAction, subjectPending] = useActionState(
    createSchoolSubjectAction,
    initialState,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveSchoolGradeAction,
    initialState,
  );
  const gradeDialog = useActionDialog(gradeState);
  const sectionDialog = useActionDialog(sectionState);
  const subjectDialog = useActionDialog(subjectState);
  const archiveDialog = useActionDialog(archiveState);
  const [archiveTarget, setArchiveTarget] = useState<SchoolGradeRow | null>(
    null,
  );

  const sectionsByGrade = new Map<string, SchoolSectionRow[]>();
  for (const section of sections) {
    const list = sectionsByGrade.get(section.gradeId) ?? [];
    list.push(section);
    sectionsByGrade.set(section.gradeId, list);
  }

  return (
    <section aria-labelledby="school-structure-heading" className="mt-12">
      <h2
        id="school-structure-heading"
        className="font-display text-2xl tracking-tight text-ink"
      >
        Grades and subjects
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Grades, sections, and subjects for school workflows.
      </p>

      <div className="mt-8">
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Grades and sections
        </h3>
        {grades.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No grades yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {grades.map((grade) => (
              <li key={grade.id} className="border-t border-line/60 pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium text-ink">
                    {grade.name}
                    {grade.code ? (
                      <span className="ml-2 text-sm text-muted">
                        ({grade.code})
                      </span>
                    ) : null}
                    {grade.status === "archived" ? (
                      <span className="ml-2 text-xs text-muted uppercase">
                        Archived
                      </span>
                    ) : null}
                  </p>
                  {canManage && grade.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveTarget(grade);
                        archiveDialog.openDialog();
                      }}
                      className="text-xs text-muted underline-offset-2 hover:underline"
                    >
                      Archive
                    </button>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {(sectionsByGrade.get(grade.id) ?? []).map((section) => (
                    <li key={section.id}>
                      Section {section.name}
                      {section.capacity != null
                        ? ` · capacity ${section.capacity}`
                        : ""}
                    </li>
                  ))}
                  {(sectionsByGrade.get(grade.id) ?? []).length === 0 ? (
                    <li>No sections yet.</li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={gradeDialog.openDialog}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            + Add grade
          </button>
          <button
            type="button"
            onClick={sectionDialog.openDialog}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            + Add section
          </button>
          <button
            type="button"
            onClick={subjectDialog.openDialog}
            className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
          >
            + Add subject
          </button>
        </div>
      ) : null}

      <div className="mt-10">
        <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Subjects
        </h3>
        {subjects.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No subjects yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {subjects.map((subject) => (
              <li key={subject.id}>
                {subject.name}
                {subject.code ? ` (${subject.code})` : ""}
                {subject.status === "archived" ? " · archived" : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <FormDialog
        open={gradeDialog.open}
        onClose={gradeDialog.closeDialog}
        title="Add grade"
        description="Create a grade level for enrolments and sections."
        submitLabel="Create grade"
        formAction={gradeAction}
        busy={gradePending}
        dirty={gradeDialog.dirty}
        onDirtyChange={gradeDialog.setDirty}
        error={gradeState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField id="school-grade-name" name="name" label="Name" required />
        <DialogField id="school-grade-code" name="code" label="Code (optional)" />
        <DialogField
          id="school-grade-sort"
          name="sort_order"
          label="Sort order"
          type="number"
          required
          defaultValue={String(grades.length + 1)}
        />
      </FormDialog>

      <FormDialog
        open={sectionDialog.open}
        onClose={sectionDialog.closeDialog}
        title="Add section"
        description="Add a section under an active grade."
        submitLabel="Create section"
        formAction={sectionAction}
        busy={sectionPending}
        dirty={sectionDialog.dirty}
        onDirtyChange={sectionDialog.setDirty}
        error={sectionState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogSelect
          id="school-section-grade"
          name="grade_id"
          label="Grade"
          required
          disabled={grades.filter((g) => g.status === "active").length === 0}
          options={grades
            .filter((g) => g.status === "active")
            .map((grade) => ({ value: grade.id, label: grade.name }))}
        />
        <DialogField
          id="school-section-name"
          name="name"
          label="Name"
          required
          placeholder="A"
        />
        <DialogField
          id="school-section-capacity"
          name="capacity"
          label="Capacity (optional)"
          type="number"
        />
      </FormDialog>

      <FormDialog
        open={subjectDialog.open}
        onClose={subjectDialog.closeDialog}
        title="Add subject"
        description="Create a subject for this school’s curriculum."
        submitLabel="Create subject"
        formAction={subjectAction}
        busy={subjectPending}
        dirty={subjectDialog.dirty}
        onDirtyChange={subjectDialog.setDirty}
        error={subjectState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="school-subject-name"
          name="name"
          label="Subject name"
          required
        />
        <DialogField
          id="school-subject-code"
          name="code"
          label="Code (optional)"
        />
      </FormDialog>

      <FormDialog
        open={archiveDialog.open && archiveTarget !== null}
        onClose={() => {
          archiveDialog.closeDialog();
          setArchiveTarget(null);
        }}
        title="Archive grade"
        description={
          archiveTarget
            ? `Archive ${archiveTarget.name}? Sections under it stay on file but the grade is no longer active.`
            : undefined
        }
        submitLabel="Archive grade"
        formAction={archiveAction}
        busy={archivePending}
        error={archiveState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="grade_id" value={archiveTarget?.id ?? ""} />
      </FormDialog>
    </section>
  );
}

export function SchoolAcademicPanel({
  schoolId,
  years,
  terms,
  grades,
  sections,
  subjects,
  canManage,
  supportsSchoolStructure,
}: AcademicPanelProps) {
  const termsByYear = new Map<string, SchoolAcademicTermRow[]>();
  for (const term of terms) {
    const list = termsByYear.get(term.academicYearId) ?? [];
    list.push(term);
    termsByYear.set(term.academicYearId, list);
  }

  return (
    <div>
      <section aria-labelledby="school-academic-years-heading">
        <h2
          id="school-academic-years-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Academic years
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Define sessions and optional terms for this school.
        </p>

        {years.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No academic years yet.</p>
        ) : (
          <ul className="mt-2">
            {years.map((year) => (
              <YearCard
                key={year.id}
                year={year}
                terms={termsByYear.get(year.id) ?? []}
                schoolId={schoolId}
                canManage={canManage}
              />
            ))}
          </ul>
        )}

        {canManage ? <CreateYearForm schoolId={schoolId} /> : null}
      </section>

      {supportsSchoolStructure ? (
        <StructurePanel
          schoolId={schoolId}
          grades={grades}
          sections={sections}
          subjects={subjects}
          canManage={canManage}
        />
      ) : (
        <p className="mt-12 text-sm text-muted">
          Grades and subjects are available for school or mixed institutions.
        </p>
      )}

      {!canManage ? (
        <p className="mt-8 text-sm text-muted">
          You can view academic structure. Only owners and admins can change it.
        </p>
      ) : null}
    </div>
  );
}
