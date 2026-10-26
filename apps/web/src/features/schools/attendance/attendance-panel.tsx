"use client";

import { useActionState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolAttendanceActionState,
  correctSchoolAttendanceMarkAction,
  openSchoolAttendanceSessionAction,
  saveSchoolAttendanceMarksAction,
  submitSchoolAttendanceSessionAction,
} from "@/features/schools/attendance/actions";
import type {
  SchoolAttendanceMarkRow,
  SchoolAttendanceSessionRow,
} from "@/features/schools/attendance/queries";
import { ATTENDANCE_STATUSES } from "@/features/schools/attendance/validate";
import type { SchoolGradeRow, SchoolSectionRow } from "@/features/schools/academic/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";

const initial: SchoolAttendanceActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  sections: SchoolSectionRow[];
  grades: SchoolGradeRow[];
  students: SchoolStudentRow[];
  sessions: SchoolAttendanceSessionRow[];
  activeSession: SchoolAttendanceSessionRow | null;
  marks: SchoolAttendanceMarkRow[];
  selectedSectionId: string;
  selectedDate: string;
  canManage: boolean;
  canCorrect: boolean;
};

export function SchoolAttendancePanel({
  schoolId,
  sections,
  grades,
  students,
  sessions,
  activeSession,
  marks,
  selectedSectionId,
  selectedDate,
  canManage,
  canCorrect,
}: Props) {
  const [openState, openAction, openPending] = useActionState(
    openSchoolAttendanceSessionAction,
    initial,
  );
  const [saveState, saveAction, savePending] = useActionState(
    saveSchoolAttendanceMarksAction,
    initial,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitSchoolAttendanceSessionAction,
    initial,
  );
  const [correctState, correctAction, correctPending] = useActionState(
    correctSchoolAttendanceMarkAction,
    initial,
  );
  const submitDialog = useActionDialog(submitState);
  const correctDialog = useActionDialog(correctState);

  const gradeName = new Map(grades.map((g) => [g.id, g.name]));
  const sectionLabel = new Map(
    sections.map((s) => [
      s.id,
      `${gradeName.get(s.gradeId) ?? "Grade"} · ${s.name}`,
    ]),
  );
  const studentLabel = new Map(
    students.map((s) => [
      s.id,
      `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
    ]),
  );

  const activeSections = sections.filter((s) => s.status === "active");
  const isDraft = activeSession?.status === "draft";
  const isSubmitted = activeSession?.status === "submitted";

  return (
    <div>
      <section aria-labelledby="open-attendance-heading">
        <h2
          id="open-attendance-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Daily attendance
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Open a section roster for a date, save a draft, then submit. Submitted
          marks can only be corrected by owners or admins with a reason.
        </p>

        {canManage ? (
          <form action={openAction} className="mt-6 grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="school_id" value={schoolId} />
            <label className="block text-sm">
              <span className="text-muted">Section</span>
              <select
                name="section_id"
                required
                defaultValue={selectedSectionId}
                className="mt-1 w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
              >
                <option value="" disabled>
                  Select section
                </option>
                {activeSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {sectionLabel.get(section.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">Date</span>
              <input
                type="date"
                name="attendance_date"
                required
                defaultValue={selectedDate}
                className="mt-1 w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={openPending || activeSections.length === 0}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
              >
                {openPending ? "Opening…" : "Open session"}
              </button>
            </div>
            {openState.error ? (
              <p role="alert" className="sm:col-span-3 text-sm text-red-700">
                {openState.error}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">
            You can view attendance but not open or edit sessions.
          </p>
        )}
      </section>

      {activeSession ? (
        <section aria-labelledby="roster-heading" className="mt-10">
          <h3
            id="roster-heading"
            className="font-display text-xl tracking-tight text-ink"
          >
            {sectionLabel.get(activeSession.sectionId) ?? "Section"} ·{" "}
            {activeSession.attendanceDate}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Status: {activeSession.status}
            {activeSession.submittedAt
              ? ` · submitted ${new Date(activeSession.submittedAt).toLocaleString()}`
              : ""}
          </p>

          {marks.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No enrolled students in this section roster.
            </p>
          ) : isDraft && canManage ? (
            <form action={saveAction} className="mt-6">
              <input type="hidden" name="school_id" value={schoolId} />
              <input type="hidden" name="session_id" value={activeSession.id} />
              <ul className="divide-y divide-line/70 border-y border-line/70">
                {marks.map((mark) => (
                  <li key={mark.id} className="grid gap-3 py-3 sm:grid-cols-3">
                    <p className="text-sm font-medium text-ink sm:col-span-1">
                      {studentLabel.get(mark.studentId) ?? mark.studentId}
                    </p>
                    <input
                      type="hidden"
                      name="student_id"
                      value={mark.studentId}
                    />
                    <label className="block text-sm">
                      <span className="sr-only">Status</span>
                      <select
                        name="status"
                        defaultValue={mark.status}
                        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                      >
                        {ATTENDANCE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="sr-only">Note</span>
                      <input
                        type="text"
                        name="note"
                        defaultValue={mark.note ?? ""}
                        placeholder="Note (optional)"
                        maxLength={500}
                        className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={savePending}
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                >
                  {savePending ? "Saving…" : "Save draft"}
                </button>
              </div>
              {saveState.error ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {saveState.error}
                </p>
              ) : null}
              {saveState.success ? (
                <p role="status" className="mt-3 text-sm text-teal">
                  {saveState.success}
                </p>
              ) : null}
            </form>
          ) : (
            <ul className="mt-6 divide-y divide-line/70 border-y border-line/70">
              {marks.map((mark) => (
                <li key={mark.id} className="py-3 text-sm">
                  <p className="font-medium text-ink">
                    {studentLabel.get(mark.studentId) ?? mark.studentId}
                    <span className="ml-2 font-normal text-muted">
                      {mark.status}
                    </span>
                  </p>
                  {mark.note ? (
                    <p className="mt-0.5 text-muted">{mark.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isDraft && canManage && marks.length > 0 ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={submitDialog.openDialog}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated"
              >
                Submit attendance
              </button>
              <FormDialog
                open={submitDialog.open}
                onClose={submitDialog.closeDialog}
                title="Submit attendance"
                description={`Lock marks for ${sectionLabel.get(activeSession.sectionId) ?? "this section"} on ${activeSession.attendanceDate}? Submitted marks need an admin correction to change.`}
                submitLabel="Submit attendance"
                formAction={submitAction}
                busy={submitPending}
                error={submitState.error}
              >
                <input type="hidden" name="school_id" value={schoolId} />
                <input
                  type="hidden"
                  name="session_id"
                  value={activeSession.id}
                />
              </FormDialog>
            </div>
          ) : null}

          {isSubmitted && canCorrect ? (
            <section
              aria-labelledby="correct-heading"
              className="mt-10 border-t border-line/70 pt-8"
            >
              <h3
                id="correct-heading"
                className="text-sm font-semibold tracking-wide text-ink uppercase"
              >
                Correct a mark
              </h3>
              <button
                type="button"
                onClick={correctDialog.openDialog}
                className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-medium text-ink"
              >
                Correct a mark
              </button>
              <FormDialog
                open={correctDialog.open}
                onClose={correctDialog.closeDialog}
                title="Correct attendance mark"
                description="Provide a reason. Corrections are audited."
                submitLabel="Apply correction"
                formAction={correctAction}
                busy={correctPending}
                dirty={correctDialog.dirty}
                onDirtyChange={correctDialog.setDirty}
                error={correctState.error}
              >
                <input type="hidden" name="school_id" value={schoolId} />
                <DialogSelect
                  id="correct-mark"
                  name="mark_id"
                  label="Student mark"
                  required
                  options={marks.map((mark) => ({
                    value: mark.id,
                    label: `${studentLabel.get(mark.studentId) ?? mark.studentId} · ${mark.status}`,
                  }))}
                />
                <DialogSelect
                  id="correct-status"
                  name="status"
                  label="New status"
                  required
                  options={ATTENDANCE_STATUSES.map((status) => ({
                    value: status,
                    label: status,
                  }))}
                />
                <DialogField
                  id="correct-reason"
                  name="reason"
                  label="Reason"
                  required
                />
              </FormDialog>
            </section>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="recent-sessions-heading" className="mt-12">
        <h2
          id="recent-sessions-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Recent sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No attendance sessions yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 border-y border-line/70">
            {sessions.map((session) => (
              <li key={session.id} className="py-3 text-sm">
                <a
                  href={`/school/attendance?school=${schoolId}&section=${session.sectionId}&date=${session.attendanceDate}`}
                  className="font-medium text-ink no-underline hover:underline"
                >
                  {sectionLabel.get(session.sectionId) ?? "Section"} ·{" "}
                  {session.attendanceDate}
                </a>
                <span className="ml-2 text-muted">{session.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
