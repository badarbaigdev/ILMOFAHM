"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolAcademicActionState,
  archiveSchoolGradeAction,
  archiveSchoolSectionAction,
  createSchoolAcademicTermAction,
  createSchoolAcademicYearAction,
  createSchoolGradeAction,
  createSchoolSectionAction,
  createSchoolSubjectAction,
  updateSchoolAcademicYearAction,
  updateSchoolGradeAction,
  updateSchoolSectionAction,
} from "@/features/schools/academic/actions";
import type {
  SchoolAcademicTermRow,
  SchoolAcademicYearRow,
  SchoolGradeRow,
  SchoolSectionRow,
  SchoolSubjectRow,
} from "@/features/schools/academic/queries";
import type { SchoolEnrolmentRow } from "@/features/schools/students/queries";
import { StatusBadge } from "@/features/schools/ui/data-table";

const initialState: SchoolAcademicActionState = {
  error: null,
  success: null,
};

export type AcademicPanelSection =
  | "overview"
  | "grades"
  | "years"
  | "subjects"
  | "links";

type AcademicPanelProps = {
  schoolId: string;
  years: SchoolAcademicYearRow[];
  terms: SchoolAcademicTermRow[];
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  enrolments: SchoolEnrolmentRow[];
  canManage: boolean;
  supportsSchoolStructure: boolean;
  activeSection: AcademicPanelSection;
};

function CreateYearForm({ schoolId }: { schoolId: string }) {
  const [state, formAction, pending] = useActionState(
    createSchoolAcademicYearAction,
    initialState,
  );
  const dialog = useActionDialog(state);

  return (
    <>
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
    </>
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
    <article className="rounded-2xl border border-line bg-paper-elevated p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              {year.name}
            </h3>
            {year.isCurrent ? (
              <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-teal uppercase">
                Current
              </span>
            ) : null}
            <StatusBadge status={year.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {year.startsOn} → {year.endsOn}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={editDialog.openDialog}
            className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink"
          >
            Edit year
          </button>
        ) : null}
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

      <div className="mt-5 border-t border-line/70 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Terms ({terms.length})
          </h4>
          {canManage ? (
            <button
              type="button"
              onClick={termDialog.openDialog}
              className="text-sm font-medium text-teal underline-offset-2 hover:underline"
            >
              + Add term
            </button>
          ) : null}
        </div>

        {terms.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No terms yet. Add Term 1 / Term 2 to plan the year.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {terms.map((term) => (
              <li
                key={term.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              >
                <span className="font-medium text-ink">
                  <span className="mr-2 text-muted">{term.sortOrder}.</span>
                  {term.name}
                </span>
                <span className="text-muted">
                  {term.startsOn} → {term.endsOn}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
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
        ) : null}
      </div>
    </article>
  );
}

function OverviewSection({
  schoolId,
  years,
  terms,
  grades,
  sections,
  subjects,
  enrolments,
  supportsSchoolStructure,
}: {
  schoolId: string;
  years: SchoolAcademicYearRow[];
  terms: SchoolAcademicTermRow[];
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  enrolments: SchoolEnrolmentRow[];
  supportsSchoolStructure: boolean;
}) {
  const currentYear = years.find((y) => y.isCurrent) ?? years[0] ?? null;
  const activeGrades = grades.filter((g) => g.status === "active").length;
  const activeSections = sections.filter((s) => s.status === "active").length;
  const enrolled = enrolments.filter((e) => e.status === "enrolled").length;
  const q = `school=${encodeURIComponent(schoolId)}`;

  const cards = [
    {
      label: "Current year",
      value: currentYear?.name ?? "—",
      hint: currentYear
        ? `${currentYear.startsOn} → ${currentYear.endsOn}`
        : "Add an academic year",
      href: `/school/academic?${q}&section=years`,
    },
    {
      label: "Grades",
      value: supportsSchoolStructure ? activeGrades : "—",
      hint: `${grades.length} total`,
      href: `/school/academic?${q}&section=grades`,
    },
    {
      label: "Sections",
      value: supportsSchoolStructure ? activeSections : "—",
      hint: `${enrolled} enrolled students`,
      href: `/school/academic?${q}&section=grades`,
    },
    {
      label: "Subjects",
      value: supportsSchoolStructure
        ? subjects.filter((s) => s.status === "active").length
        : "—",
      hint: `${terms.length} terms across years`,
      href: `/school/academic?${q}&section=subjects`,
    },
  ];

  return (
    <section aria-labelledby="academic-overview-heading">
      <h2
        id="academic-overview-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Overview
      </h2>
      <p className="mt-1 text-sm text-muted">
        Structure at a glance — jump into grades, years, or subjects to edit.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card-interactive rounded-2xl border border-line bg-paper-elevated p-4 no-underline"
          >
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GradesSection({
  schoolId,
  grades,
  sections,
  enrolments,
  canManage,
}: {
  schoolId: string;
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  enrolments: SchoolEnrolmentRow[];
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
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveSchoolGradeAction,
    initialState,
  );
  const [editGradeState, editGradeAction, editGradePending] = useActionState(
    updateSchoolGradeAction,
    initialState,
  );
  const [editSectionState, editSectionAction, editSectionPending] =
    useActionState(updateSchoolSectionAction, initialState);
  const [archiveSectionState, archiveSectionAction, archiveSectionPending] =
    useActionState(archiveSchoolSectionAction, initialState);
  const gradeDialog = useActionDialog(gradeState);
  const sectionDialog = useActionDialog(sectionState);
  const archiveDialog = useActionDialog(archiveState);
  const editGradeDialog = useActionDialog(editGradeState);
  const editSectionDialog = useActionDialog(editSectionState);
  const archiveSectionDialog = useActionDialog(archiveSectionState);
  const [archiveTarget, setArchiveTarget] = useState<SchoolGradeRow | null>(
    null,
  );
  const [editGradeTarget, setEditGradeTarget] = useState<SchoolGradeRow | null>(
    null,
  );
  const [editSectionTarget, setEditSectionTarget] =
    useState<SchoolSectionRow | null>(null);
  const [archiveSectionTarget, setArchiveSectionTarget] =
    useState<SchoolSectionRow | null>(null);

  const sortedGrades = useMemo(
    () => [...grades].sort((a, b) => a.sortOrder - b.sortOrder),
    [grades],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const firstActive = sortedGrades.find((g) => g.status === "active");
    return new Set(firstActive ? [firstActive.id] : []);
  });

  const sectionsByGrade = useMemo(() => {
    const map = new Map<string, SchoolSectionRow[]>();
    for (const section of sections) {
      const list = map.get(section.gradeId) ?? [];
      list.push(section);
      map.set(section.gradeId, list);
    }
    return map;
  }, [sections]);

  const enrolledByGrade = useMemo(() => {
    const map = new Map<string, number>();
    for (const enrolment of enrolments) {
      if (enrolment.status !== "enrolled") continue;
      map.set(enrolment.gradeId, (map.get(enrolment.gradeId) ?? 0) + 1);
    }
    return map;
  }, [enrolments]);

  const enrolledBySection = useMemo(() => {
    const map = new Map<string, number>();
    for (const enrolment of enrolments) {
      if (enrolment.status !== "enrolled" || !enrolment.sectionId) continue;
      map.set(
        enrolment.sectionId,
        (map.get(enrolment.sectionId) ?? 0) + 1,
      );
    }
    return map;
  }, [enrolments]);

  function toggleGrade(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section aria-labelledby="school-structure-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="school-structure-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Grades and sections
          </h2>
          <p className="mt-1 text-sm text-muted">
            Expand a grade to review capacity and current enrolment.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
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
          </div>
        ) : null}
      </div>

      {sortedGrades.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No grades yet. Add Grade 1–10 (or your scheme) to start enrolments.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {sortedGrades.map((grade) => {
            const gradeSections = sectionsByGrade.get(grade.id) ?? [];
            const enrolled = enrolledByGrade.get(grade.id) ?? 0;
            const capacityTotal = gradeSections.reduce(
              (sum, s) => sum + (s.capacity ?? 0),
              0,
            );
            const open = openIds.has(grade.id);

            return (
              <li
                key={grade.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper-elevated"
              >
                <button
                  type="button"
                  onClick={() => toggleGrade(grade.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        {grade.name}
                      </span>
                      {grade.code ? (
                        <span className="text-sm text-muted">({grade.code})</span>
                      ) : null}
                      <StatusBadge status={grade.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {gradeSections.length} section
                      {gradeSections.length === 1 ? "" : "s"}
                      <span className="mx-1.5 text-line">·</span>
                      {enrolled} enrolled
                      {capacityTotal > 0 ? (
                        <>
                          <span className="mx-1.5 text-line">·</span>
                          capacity {capacityTotal}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className="shrink-0 text-muted" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                </button>

                {open ? (
                  <div className="border-t border-line/70 px-4 py-4">
                    {gradeSections.length === 0 ? (
                      <p className="text-sm text-muted">
                        No sections yet
                        {canManage ? " — add Section A / B." : "."}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {gradeSections.map((section) => {
                          const sectionEnrolled =
                            enrolledBySection.get(section.id) ?? 0;
                          const fill =
                            section.capacity != null && section.capacity > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (sectionEnrolled / section.capacity) * 100,
                                  ),
                                )
                              : null;

                          return (
                            <li
                              key={section.id}
                              className="rounded-xl border border-line bg-paper px-3 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-ink">
                                    Section {section.name}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted">
                                    {sectionEnrolled}
                                    {section.capacity != null
                                      ? ` / ${section.capacity}`
                                      : ""}{" "}
                                    enrolled
                                    {section.status !== "active" ? (
                                      <>
                                        <span className="mx-1.5 text-line">
                                          ·
                                        </span>
                                        <StatusBadge status={section.status} />
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                                {canManage && section.status === "active" ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditSectionTarget(section);
                                        editSectionDialog.openDialog();
                                      }}
                                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setArchiveSectionTarget(section);
                                        archiveSectionDialog.openDialog();
                                      }}
                                      className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted"
                                    >
                                      Archive
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {fill != null ? (
                                <div
                                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60"
                                  role="meter"
                                  aria-valuenow={fill}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`${section.name} capacity`}
                                >
                                  <div
                                    className="h-full rounded-full bg-teal"
                                    style={{ width: `${fill}%` }}
                                  />
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {canManage && grade.status === "active" ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditGradeTarget(grade);
                            editGradeDialog.openDialog();
                          }}
                          className="text-xs font-medium text-teal underline-offset-2 hover:underline"
                        >
                          Edit grade
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setArchiveTarget(grade);
                            archiveDialog.openDialog();
                          }}
                          className="text-xs text-muted underline-offset-2 hover:underline"
                        >
                          Archive grade
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

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

      <FormDialog
        open={editGradeDialog.open && editGradeTarget !== null}
        onClose={() => {
          editGradeDialog.closeDialog();
          setEditGradeTarget(null);
        }}
        title="Edit grade"
        description="Update the grade name, code, or sort order."
        submitLabel="Save grade"
        formAction={editGradeAction}
        busy={editGradePending}
        dirty={editGradeDialog.dirty}
        onDirtyChange={editGradeDialog.setDirty}
        error={editGradeState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="grade_id" value={editGradeTarget?.id ?? ""} />
        <DialogField
          id="edit-grade-name"
          name="name"
          label="Name"
          required
          defaultValue={editGradeTarget?.name ?? ""}
        />
        <DialogField
          id="edit-grade-code"
          name="code"
          label="Code (optional)"
          defaultValue={editGradeTarget?.code ?? ""}
        />
        <DialogField
          id="edit-grade-sort"
          name="sort_order"
          label="Sort order"
          type="number"
          required
          defaultValue={String(editGradeTarget?.sortOrder ?? 1)}
        />
      </FormDialog>

      <FormDialog
        open={editSectionDialog.open && editSectionTarget !== null}
        onClose={() => {
          editSectionDialog.closeDialog();
          setEditSectionTarget(null);
        }}
        title="Edit section"
        description="Update the section name or capacity."
        submitLabel="Save section"
        formAction={editSectionAction}
        busy={editSectionPending}
        dirty={editSectionDialog.dirty}
        onDirtyChange={editSectionDialog.setDirty}
        error={editSectionState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="section_id"
          value={editSectionTarget?.id ?? ""}
        />
        <DialogField
          id="edit-section-name"
          name="name"
          label="Name"
          required
          defaultValue={editSectionTarget?.name ?? ""}
        />
        <DialogField
          id="edit-section-capacity"
          name="capacity"
          label="Capacity (optional)"
          type="number"
          defaultValue={
            editSectionTarget?.capacity != null
              ? String(editSectionTarget.capacity)
              : ""
          }
        />
      </FormDialog>

      <FormDialog
        open={archiveSectionDialog.open && archiveSectionTarget !== null}
        onClose={() => {
          archiveSectionDialog.closeDialog();
          setArchiveSectionTarget(null);
        }}
        title="Archive section"
        description={
          archiveSectionTarget
            ? `Archive section ${archiveSectionTarget.name}? It will no longer appear for new enrolments or attendance.`
            : undefined
        }
        submitLabel="Archive section"
        formAction={archiveSectionAction}
        busy={archiveSectionPending}
        error={archiveSectionState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="section_id"
          value={archiveSectionTarget?.id ?? ""}
        />
      </FormDialog>
    </section>
  );
}

function YearsSection({
  schoolId,
  years,
  terms,
  canManage,
}: {
  schoolId: string;
  years: SchoolAcademicYearRow[];
  terms: SchoolAcademicTermRow[];
  canManage: boolean;
}) {
  const termsByYear = new Map<string, SchoolAcademicTermRow[]>();
  for (const term of terms) {
    const list = termsByYear.get(term.academicYearId) ?? [];
    list.push(term);
    termsByYear.set(term.academicYearId, list);
  }

  return (
    <section aria-labelledby="school-academic-years-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="school-academic-years-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Academic years
          </h2>
          <p className="mt-1 text-sm text-muted">
            Mark the current year clearly, then add terms for the calendar.
          </p>
        </div>
        {canManage ? <CreateYearForm schoolId={schoolId} /> : null}
      </div>

      {years.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No academic years yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {years.map((year) => (
            <li key={year.id}>
              <YearCard
                year={year}
                terms={termsByYear.get(year.id) ?? []}
                schoolId={schoolId}
                canManage={canManage}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SubjectsSection({
  schoolId,
  grades,
  subjects,
  canManage,
}: {
  schoolId: string;
  grades: SchoolGradeRow[];
  subjects: SchoolSubjectRow[];
  canManage: boolean;
}) {
  const [subjectState, subjectAction, subjectPending] = useActionState(
    createSchoolSubjectAction,
    initialState,
  );
  const subjectDialog = useActionDialog(subjectState);
  const activeGrades = grades.filter((g) => g.status === "active");

  return (
    <section aria-labelledby="school-subjects-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="school-subjects-heading"
            className="text-sm font-semibold tracking-wide text-ink uppercase"
          >
            Subjects
          </h2>
          <p className="mt-1 text-sm text-muted">
            School-wide subject catalog. Assign subjects to grades when building
            timetables and report cards.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={subjectDialog.openDialog}
            className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
          >
            + Add subject
          </button>
        ) : null}
      </div>

      {subjects.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No subjects yet. Add Maths, English, Urdu, and other offerings.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line/70 rounded-2xl border border-line bg-paper-elevated">
          {subjects.map((subject) => (
            <li
              key={subject.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {subject.name}
                  {subject.code ? (
                    <span className="ml-2 text-muted">({subject.code})</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Available to {activeGrades.length} active grade
                  {activeGrades.length === 1 ? "" : "s"}
                </p>
              </div>
              <StatusBadge status={subject.status} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-2xl border border-dashed border-line bg-paper px-4 py-4">
        <p className="text-sm font-medium text-ink">Grade & section assignment</p>
        <p className="mt-1 text-sm text-muted">
          Subjects are catalogued school-wide today. Per-grade and per-section
          subject maps (for timetables) will attach here without changing this
          catalog.
        </p>
        {activeGrades.length > 0 ? (
          <p className="mt-3 text-xs text-muted">
            Ready grades:{" "}
            {activeGrades.map((g) => g.name).join(", ")}
          </p>
        ) : null}
      </div>

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
    </section>
  );
}

function LinksSection({ schoolId }: { schoolId: string }) {
  const q = `school=${encodeURIComponent(schoolId)}`;
  const links = [
    {
      href: `/school/students?${q}&section=enrolments`,
      title: "Student enrolments",
      body: "Place students into grades and sections for the current year.",
    },
    {
      href: `/school/attendance?${q}`,
      title: "Attendance registers",
      body: "Open daily attendance by section once classes are set up.",
    },
    {
      href: `/school/timetable?${q}`,
      title: "Timetables",
      body: "Schedule weekly lessons by class or teacher once subjects are ready.",
    },
    {
      href: `/school/students?${q}&section=directory`,
      title: "Student directory",
      body: "Review who is on roll before building timetables.",
    },
  ];

  return (
    <section aria-labelledby="academic-links-heading">
      <h2
        id="academic-links-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Connected workflows
      </h2>
      <p className="mt-1 text-sm text-muted">
        Academic structure feeds enrolments, attendance, and weekly timetables.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="card-interactive block h-full rounded-2xl border border-line bg-paper-elevated p-4 no-underline"
            >
              <p className="text-sm font-semibold text-ink">{link.title}</p>
              <p className="mt-1 text-sm text-muted">{link.body}</p>
            </Link>
          </li>
        ))}
      </ul>
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
  enrolments,
  canManage,
  supportsSchoolStructure,
  activeSection,
}: AcademicPanelProps) {
  return (
    <div>
      {activeSection === "overview" ? (
        <OverviewSection
          schoolId={schoolId}
          years={years}
          terms={terms}
          grades={grades}
          sections={sections}
          subjects={subjects}
          enrolments={enrolments}
          supportsSchoolStructure={supportsSchoolStructure}
        />
      ) : null}

      {activeSection === "grades" ? (
        supportsSchoolStructure ? (
          <GradesSection
            schoolId={schoolId}
            grades={grades}
            sections={sections}
            enrolments={enrolments}
            canManage={canManage}
          />
        ) : (
          <p className="text-sm text-muted">
            Grades and sections are available for school or mixed institutions.
          </p>
        )
      ) : null}

      {activeSection === "years" ? (
        <YearsSection
          schoolId={schoolId}
          years={years}
          terms={terms}
          canManage={canManage}
        />
      ) : null}

      {activeSection === "subjects" ? (
        supportsSchoolStructure ? (
          <SubjectsSection
            schoolId={schoolId}
            grades={grades}
            subjects={subjects}
            canManage={canManage}
          />
        ) : (
          <p className="text-sm text-muted">
            Subjects are available for school or mixed institutions.
          </p>
        )
      ) : null}

      {activeSection === "links" ? <LinksSection schoolId={schoolId} /> : null}

      {!canManage ? (
        <p className="mt-8 text-sm text-muted">
          You can view academic structure. Only owners and admins can change it.
        </p>
      ) : null}
    </div>
  );
}
