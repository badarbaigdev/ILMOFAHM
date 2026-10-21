"use client";

import { useActionState } from "react";

import {
  type SchoolActionState,
  createGradeAction,
  createSectionAction,
  createSubjectAction,
} from "@/features/academic/school/actions";
import type {
  GradeRow,
  SectionRow,
  SubjectRow,
} from "@/features/academic/school/queries";

const initialState: SchoolActionState = { error: null, success: null };

type SchoolPanelProps = {
  organizationId: string;
  grades: GradeRow[];
  sections: SectionRow[];
  subjects: SubjectRow[];
  canManage: boolean;
};

export function SchoolPanel({
  organizationId,
  grades,
  sections,
  subjects,
  canManage,
}: SchoolPanelProps) {
  const [gradeState, gradeAction, gradePending] = useActionState(
    createGradeAction,
    initialState,
  );
  const [sectionState, sectionAction, sectionPending] = useActionState(
    createSectionAction,
    initialState,
  );
  const [subjectState, subjectAction, subjectPending] = useActionState(
    createSubjectAction,
    initialState,
  );

  const sectionsByGrade = new Map<string, SectionRow[]>();
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
        School structure
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Grades, sections, and subjects for year-based school workflows.
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
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form action={gradeAction} className="max-w-md space-y-3" noValidate>
            <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
              Add grade
            </h3>
            <input
              type="hidden"
              name="organization_id"
              value={organizationId}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="grade-name"
                className="block text-sm font-medium text-ink"
              >
                Name
              </label>
              <input
                id="grade-name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="grade-code"
                className="block text-sm font-medium text-ink"
              >
                Code (optional)
              </label>
              <input
                id="grade-code"
                name="code"
                type="text"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="grade-sort"
                className="block text-sm font-medium text-ink"
              >
                Sort order
              </label>
              <input
                id="grade-sort"
                name="sort_order"
                type="number"
                min={1}
                defaultValue={grades.length + 1}
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            {gradeState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {gradeState.error}
              </p>
            ) : null}
            {gradeState.success ? (
              <p role="status" className="text-sm text-teal">
                {gradeState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={gradePending}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {gradePending ? "Creating…" : "Create grade"}
            </button>
          </form>

          <form
            action={sectionAction}
            className="max-w-md space-y-3"
            noValidate
          >
            <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
              Add section
            </h3>
            <input
              type="hidden"
              name="organization_id"
              value={organizationId}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="section-grade"
                className="block text-sm font-medium text-ink"
              >
                Grade
              </label>
              <select
                id="section-grade"
                name="grade_id"
                required
                disabled={grades.length === 0}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                <option value="">Select grade</option>
                {grades
                  .filter((g) => g.status === "active")
                  .map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="section-name"
                className="block text-sm font-medium text-ink"
              >
                Name
              </label>
              <input
                id="section-name"
                name="name"
                type="text"
                required
                placeholder="A"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="section-capacity"
                className="block text-sm font-medium text-ink"
              >
                Capacity (optional)
              </label>
              <input
                id="section-capacity"
                name="capacity"
                type="number"
                min={1}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            {sectionState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {sectionState.error}
              </p>
            ) : null}
            {sectionState.success ? (
              <p role="status" className="text-sm text-teal">
                {sectionState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={sectionPending || grades.length === 0}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {sectionPending ? "Creating…" : "Create section"}
            </button>
          </form>
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

        {canManage ? (
          <form
            action={subjectAction}
            className="mt-4 max-w-md space-y-3"
            noValidate
          >
            <input
              type="hidden"
              name="organization_id"
              value={organizationId}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="subject-name"
                className="block text-sm font-medium text-ink"
              >
                Subject name
              </label>
              <input
                id="subject-name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="subject-code"
                className="block text-sm font-medium text-ink"
              >
                Code (optional)
              </label>
              <input
                id="subject-code"
                name="code"
                type="text"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            {subjectState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {subjectState.error}
              </p>
            ) : null}
            {subjectState.success ? (
              <p role="status" className="text-sm text-teal">
                {subjectState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={subjectPending}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {subjectPending ? "Creating…" : "Create subject"}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
