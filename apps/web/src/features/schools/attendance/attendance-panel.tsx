"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

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
import {
  countAttendanceStatuses,
  primaryStatusEntries,
  type SchoolAttendanceDaySummary,
} from "@/features/schools/attendance/summary";
import {
  ATTENDANCE_STATUS_LABELS,
  PRIMARY_ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceStatus,
} from "@/features/schools/attendance/validate";
import type {
  SchoolGradeRow,
  SchoolSectionRow,
} from "@/features/schools/academic/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import { StatusBadge } from "@/features/schools/ui/data-table";

const initial: SchoolAttendanceActionState = { error: null, success: null };

type DraftMark = {
  studentId: string;
  status: AttendanceStatus;
  note: string;
};

type Props = {
  schoolId: string;
  schoolName: string;
  sections: SchoolSectionRow[];
  grades: SchoolGradeRow[];
  students: SchoolStudentRow[];
  sessions: SchoolAttendanceSessionRow[];
  activeSession: SchoolAttendanceSessionRow | null;
  marks: SchoolAttendanceMarkRow[];
  selectedGradeId: string;
  selectedSectionId: string;
  selectedDate: string;
  daySummary: SchoolAttendanceDaySummary;
  canManage: boolean;
  canCorrect: boolean;
};

function statusTone(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "absent":
      return "border-red-300 bg-red-50 text-red-800";
    case "late":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "excused":
      return "border-sky-300 bg-sky-50 text-sky-900";
    case "half_day":
      return "border-violet-300 bg-violet-50 text-violet-900";
    default:
      return "border-line bg-paper text-ink";
  }
}

function formatDisplayDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SchoolAttendancePanel({
  schoolId,
  schoolName,
  sections,
  grades,
  students,
  sessions,
  activeSession,
  marks,
  selectedGradeId,
  selectedSectionId,
  selectedDate,
  daySummary,
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

  const [gradeId, setGradeId] = useState(selectedGradeId);
  const [sectionId, setSectionId] = useState(selectedSectionId);
  const [date, setDate] = useState(selectedDate);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<DraftMark[]>(() =>
    marks.map((m) => ({
      studentId: m.studentId,
      status: m.status as AttendanceStatus,
      note: m.note ?? "",
    })),
  );

  useEffect(() => {
    setGradeId(selectedGradeId);
    setSectionId(selectedSectionId);
    setDate(selectedDate);
  }, [selectedGradeId, selectedSectionId, selectedDate]);

  useEffect(() => {
    setDrafts(
      marks.map((m) => ({
        studentId: m.studentId,
        status: m.status as AttendanceStatus,
        note: m.note ?? "",
      })),
    );
  }, [marks]);

  const gradeName = useMemo(
    () => new Map(grades.map((g) => [g.id, g.name])),
    [grades],
  );
  const sectionById = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  );
  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );

  const activeSections = sections.filter((s) => s.status === "active");
  const filteredSections = gradeId
    ? activeSections.filter((s) => s.gradeId === gradeId)
    : activeSections;

  const isDraft = activeSession?.status === "draft";
  const isSubmitted = activeSession?.status === "submitted";

  const rosterCounts = countAttendanceStatuses(drafts);
  const summarySource = activeSession ? rosterCounts : daySummary.byStatus;
  const summaryCards = primaryStatusEntries(summarySource);

  const filteredDrafts = drafts.filter((draft) => {
    if (!search.trim()) return true;
    const student = studentById.get(draft.studentId);
    if (!student) return false;
    const hay = `${student.studentNumber} ${student.firstName} ${student.lastName}`.toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  function setAllStatus(status: AttendanceStatus) {
    setDrafts((prev) => prev.map((d) => ({ ...d, status })));
  }

  function updateDraft(
    studentId: string,
    patch: Partial<Pick<DraftMark, "status" | "note">>,
  ) {
    setDrafts((prev) =>
      prev.map((d) => (d.studentId === studentId ? { ...d, ...patch } : d)),
    );
  }

  function sectionLabel(id: string): string {
    const section = sectionById.get(id);
    if (!section) return "Section";
    return `${gradeName.get(section.gradeId) ?? "Class"} · ${section.name}`;
  }

  return (
    <div className="pb-24">
      {/* 1. Page title and date */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
            {schoolName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-muted">
            {formatDisplayDate(selectedDate)}
            {activeSession ? (
              <>
                <span className="mx-2 text-line">·</span>
                <StatusBadge status={activeSession.status} />
              </>
            ) : null}
          </p>
        </div>
        {canManage && sectionId ? (
          <form action={openAction}>
            <input type="hidden" name="school_id" value={schoolId} />
            <input type="hidden" name="section_id" value={sectionId} />
            <input type="hidden" name="attendance_date" value={date} />
            <button
              type="submit"
              disabled={openPending || !sectionId}
              className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {openPending
                ? "Opening…"
                : activeSession
                  ? "Reload register"
                  : "Open register"}
            </button>
          </form>
        ) : null}
      </header>

      {/* 2. Attendance summary cards */}
      <section
        aria-label="Attendance summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {summaryCards.map(({ status, value }) => (
          <article
            key={status}
            className={`rounded-2xl border p-4 ${statusTone(status)}`}
          >
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">
              {ATTENDANCE_STATUS_LABELS[status]}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </article>
        ))}
      </section>
      <p className="mt-2 text-xs text-muted">
        {activeSession
          ? `${rosterCounts.total} students on this register`
          : daySummary.markedStudents > 0
            ? `${daySummary.markedStudents} marked today · ${daySummary.draftSessions} draft · ${daySummary.submittedSessions} submitted${
                daySummary.presentRate != null
                  ? ` · ${daySummary.presentRate}% in school`
                  : ""
              }`
            : "Open a class register to start marking."}
      </p>

      {/* 3. Filters */}
      <section
        aria-label="Attendance filters"
        className="mt-5 rounded-2xl border border-line bg-paper-elevated p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-muted">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Class</span>
            <select
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setSectionId("");
              }}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            >
              <option value="">All classes</option>
              {grades
                .filter((g) => g.status === "active")
                .map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Section</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            >
              <option value="">Select section</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {sectionLabel(section.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Search students</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or number"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canManage ? (
            <form action={openAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="school_id" value={schoolId} />
              <input type="hidden" name="section_id" value={sectionId} />
              <input type="hidden" name="attendance_date" value={date} />
              <button
                type="submit"
                disabled={openPending || !sectionId}
                className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
              >
                {openPending ? "Opening…" : "Load register"}
              </button>
            </form>
          ) : null}
          <a
            href={`/school/attendance?school=${schoolId}&date=${encodeURIComponent(date)}${
              gradeId ? `&grade=${encodeURIComponent(gradeId)}` : ""
            }${
              sectionId ? `&section=${encodeURIComponent(sectionId)}` : ""
            }`}
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink no-underline"
          >
            Apply filters
          </a>
          {openState.error ? (
            <p role="alert" className="text-sm text-red-700">
              {openState.error}
            </p>
          ) : null}
        </div>
      </section>

      {/* 4 + 5. Student table + bulk / save */}
      {activeSession ? (
        <section aria-labelledby="roster-heading" className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="roster-heading"
                className="text-sm font-semibold tracking-wide text-ink uppercase"
              >
                Class register
              </h2>
              <p className="mt-1 text-sm text-muted">
                {sectionLabel(activeSession.sectionId)} ·{" "}
                {activeSession.attendanceDate}
                {activeSession.submittedAt
                  ? ` · submitted ${new Date(activeSession.submittedAt).toLocaleString()}`
                  : ""}
              </p>
            </div>
          </div>

          {drafts.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No enrolled students in this section roster.
            </p>
          ) : (
            <form action={saveAction} className="mt-4">
              <input type="hidden" name="school_id" value={schoolId} />
              <input type="hidden" name="session_id" value={activeSession.id} />

              {/* Full roster payloads — search only filters the visible rows. */}
              {drafts.map((draft) => (
                <div key={`payload-${draft.studentId}`} className="hidden">
                  <input
                    type="hidden"
                    name="student_id"
                    value={draft.studentId}
                  />
                  <input type="hidden" name="status" value={draft.status} />
                  <input type="hidden" name="note" value={draft.note} />
                </div>
              ))}

              <div className="overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {filteredDrafts.map((draft) => {
                      const student = studentById.get(draft.studentId);
                      return (
                        <tr key={draft.studentId} className="align-top">
                          <td className="px-4 py-3">
                            <p className="font-medium text-ink">
                              {student
                                ? `${student.firstName} ${student.lastName}`
                                : draft.studentId}
                            </p>
                            <p className="text-xs text-muted">
                              {student?.studentNumber ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {isDraft && canManage ? (
                              <div
                                role="group"
                                aria-label={`Status for ${student?.firstName ?? "student"}`}
                                className="flex flex-wrap gap-1.5"
                              >
                                {PRIMARY_ATTENDANCE_STATUSES.map((status) => {
                                  const active = draft.status === status;
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() =>
                                        updateDraft(draft.studentId, { status })
                                      }
                                      className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                                        active
                                          ? statusTone(status)
                                          : "border-line bg-paper text-muted hover:text-ink"
                                      }`}
                                    >
                                      {ATTENDANCE_STATUS_LABELS[status]}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <span
                                className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusTone(draft.status)}`}
                              >
                                {attendanceStatusLabel(draft.status)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isDraft && canManage ? (
                              <input
                                type="text"
                                value={draft.note}
                                onChange={(e) =>
                                  updateDraft(draft.studentId, {
                                    note: e.target.value,
                                  })
                                }
                                placeholder="Optional"
                                maxLength={500}
                                className="w-full min-w-[10rem] rounded-md border border-line bg-paper px-2 py-1.5 text-ink"
                              />
                            ) : (
                              <span className="text-muted">
                                {draft.note || "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 5. Bulk actions and save/submit */}
              {isDraft && canManage ? (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
                  <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAllStatus("present")}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                      >
                        Mark all present
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllStatus("absent")}
                        className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
                      >
                        Mark all absent
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {saveState.error || submitState.error ? (
                        <p role="alert" className="text-sm text-red-700">
                          {saveState.error || submitState.error}
                        </p>
                      ) : null}
                      {saveState.success || submitState.success ? (
                        <p role="status" className="text-sm text-teal">
                          {saveState.success || submitState.success}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={savePending}
                        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                      >
                        {savePending ? "Saving…" : "Save draft"}
                      </button>
                      <button
                        type="button"
                        onClick={submitDialog.openDialog}
                        className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isDraft && canManage && filteredDrafts.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  No students match this search.
                </p>
              ) : null}
            </form>
          )}

          {isDraft && canManage && drafts.length > 0 ? (
            <FormDialog
              open={submitDialog.open}
              onClose={submitDialog.closeDialog}
              title="Submit attendance"
              description={`Lock marks for ${sectionLabel(activeSession.sectionId)} on ${activeSession.attendanceDate}? Submitted marks need an admin correction to change.`}
              submitLabel="Submit attendance"
              formAction={submitAction}
              busy={submitPending}
              error={submitState.error}
            >
              <input type="hidden" name="school_id" value={schoolId} />
              <input type="hidden" name="session_id" value={activeSession.id} />
            </FormDialog>
          ) : null}

          {isSubmitted && canCorrect ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={correctDialog.openDialog}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink"
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
                  options={marks.map((mark) => {
                    const student = studentById.get(mark.studentId);
                    const name = student
                      ? `${student.firstName} ${student.lastName}`
                      : mark.studentId;
                    return {
                      value: mark.id,
                      label: `${name} · ${attendanceStatusLabel(mark.status)}`,
                    };
                  })}
                />
                <DialogSelect
                  id="correct-status"
                  name="status"
                  label="New status"
                  required
                  options={PRIMARY_ATTENDANCE_STATUSES.map((status) => ({
                    value: status,
                    label: ATTENDANCE_STATUS_LABELS[status],
                  }))}
                />
                <DialogField
                  id="correct-reason"
                  name="reason"
                  label="Reason"
                  required
                />
              </FormDialog>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-dashed border-line bg-paper-elevated px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            Pick a date, class, and section, then open the register.
          </p>
          <p className="mt-2 text-sm text-muted">
            Quick marking stays on one screen — save a draft, then submit when
            the register is complete.
          </p>
        </section>
      )}

      {/* 6. Trends / reporting (secondary) */}
      <section
        aria-labelledby="recent-sessions-heading"
        className="mt-10 border-t border-line/70 pt-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="recent-sessions-heading"
              className="text-sm font-semibold tracking-wide text-ink uppercase"
            >
              Recent sessions
            </h2>
            <p className="mt-1 text-sm text-muted">
              Trends and full reports stay secondary to marking.
            </p>
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No attendance sessions yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70 rounded-2xl border border-line bg-paper-elevated">
            {sessions.slice(0, 8).map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <a
                  href={`/school/attendance?school=${schoolId}&section=${session.sectionId}&date=${session.attendanceDate}`}
                  className="min-w-0 font-medium text-ink no-underline hover:underline"
                >
                  {sectionLabel(session.sectionId)} · {session.attendanceDate}
                </a>
                <StatusBadge status={session.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
