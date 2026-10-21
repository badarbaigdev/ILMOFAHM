"use client";

import { useActionState } from "react";

import {
  type AcademyActionState,
  createCohortAction,
  createCourseAction,
} from "@/features/academic/academy/actions";
import type {
  CohortRow,
  CourseRow,
} from "@/features/academic/academy/queries";
import type { AcademicYearRow } from "@/features/academic/years/queries";

const initialState: AcademyActionState = { error: null, success: null };

type AcademyPanelProps = {
  organizationId: string;
  courses: CourseRow[];
  cohorts: CohortRow[];
  years: AcademicYearRow[];
  canManage: boolean;
};

export function AcademyPanel({
  organizationId,
  courses,
  cohorts,
  years,
  canManage,
}: AcademyPanelProps) {
  const [courseState, courseAction, coursePending] = useActionState(
    createCourseAction,
    initialState,
  );
  const [cohortState, cohortAction, cohortPending] = useActionState(
    createCohortAction,
    initialState,
  );

  const cohortsByCourse = new Map<string, CohortRow[]>();
  for (const cohort of cohorts) {
    const list = cohortsByCourse.get(cohort.courseId) ?? [];
    list.push(cohort);
    cohortsByCourse.set(cohort.courseId, list);
  }

  return (
    <section aria-labelledby="academy-structure-heading" className="mt-12">
      <h2
        id="academy-structure-heading"
        className="font-display text-2xl tracking-tight text-ink"
      >
        Academy structure
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Courses and cohorts/batches. School grades are not required here.
      </p>

      {courses.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No courses yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {courses.map((course) => (
            <li key={course.id} className="border-t border-line/60 pt-4">
              <p className="font-medium text-ink">
                {course.name}
                {course.code ? (
                  <span className="ml-2 text-sm text-muted">({course.code})</span>
                ) : null}
                {course.status === "archived" ? (
                  <span className="ml-2 text-xs text-muted uppercase">
                    Archived
                  </span>
                ) : null}
              </p>
              {course.description ? (
                <p className="mt-1 text-sm text-muted">{course.description}</p>
              ) : null}
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {(cohortsByCourse.get(course.id) ?? []).map((cohort) => (
                  <li key={cohort.id}>
                    {cohort.name}
                    {cohort.capacity != null
                      ? ` · capacity ${cohort.capacity}`
                      : ""}
                    {cohort.startsOn
                      ? ` · ${cohort.startsOn}${cohort.endsOn ? ` → ${cohort.endsOn}` : ""}`
                      : ""}
                    {` · ${cohort.status}`}
                  </li>
                ))}
                {(cohortsByCourse.get(course.id) ?? []).length === 0 ? (
                  <li>No cohorts yet.</li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form action={courseAction} className="max-w-md space-y-3" noValidate>
            <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
              Add course
            </h3>
            <input type="hidden" name="organization_id" value={organizationId} />
            <div className="space-y-1.5">
              <label
                htmlFor="course-name"
                className="block text-sm font-medium text-ink"
              >
                Name
              </label>
              <input
                id="course-name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="course-code"
                className="block text-sm font-medium text-ink"
              >
                Code (optional)
              </label>
              <input
                id="course-code"
                name="code"
                type="text"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="course-description"
                className="block text-sm font-medium text-ink"
              >
                Description (optional)
              </label>
              <textarea
                id="course-description"
                name="description"
                rows={2}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            {courseState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {courseState.error}
              </p>
            ) : null}
            {courseState.success ? (
              <p role="status" className="text-sm text-teal">
                {courseState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={coursePending}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {coursePending ? "Creating…" : "Create course"}
            </button>
          </form>

          <form action={cohortAction} className="max-w-md space-y-3" noValidate>
            <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
              Add cohort / batch
            </h3>
            <input type="hidden" name="organization_id" value={organizationId} />
            <div className="space-y-1.5">
              <label
                htmlFor="cohort-course"
                className="block text-sm font-medium text-ink"
              >
                Course
              </label>
              <select
                id="cohort-course"
                name="course_id"
                required
                disabled={courses.length === 0}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                <option value="">Select course</option>
                {courses
                  .filter((c) => c.status === "active")
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cohort-name"
                className="block text-sm font-medium text-ink"
              >
                Name
              </label>
              <input
                id="cohort-name"
                name="name"
                type="text"
                required
                placeholder="Batch A"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="cohort-starts"
                  className="block text-sm font-medium text-ink"
                >
                  Starts (optional)
                </label>
                <input
                  id="cohort-starts"
                  name="starts_on"
                  type="date"
                  className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="cohort-ends"
                  className="block text-sm font-medium text-ink"
                >
                  Ends (optional)
                </label>
                <input
                  id="cohort-ends"
                  name="ends_on"
                  type="date"
                  className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cohort-capacity"
                className="block text-sm font-medium text-ink"
              >
                Capacity (optional)
              </label>
              <input
                id="cohort-capacity"
                name="capacity"
                type="number"
                min={1}
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cohort-year"
                className="block text-sm font-medium text-ink"
              >
                Academic year (optional)
              </label>
              <select
                id="cohort-year"
                name="academic_year_id"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                <option value="">None</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cohort-status"
                className="block text-sm font-medium text-ink"
              >
                Status
              </label>
              <select
                id="cohort-status"
                name="status"
                defaultValue="planned"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {cohortState.error ? (
              <p role="alert" className="text-sm text-red-700">
                {cohortState.error}
              </p>
            ) : null}
            {cohortState.success ? (
              <p role="status" className="text-sm text-teal">
                {cohortState.success}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={cohortPending || courses.length === 0}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {cohortPending ? "Creating…" : "Create cohort"}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
