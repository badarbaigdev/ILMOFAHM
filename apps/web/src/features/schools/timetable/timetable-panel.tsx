"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { DialogField, FormDialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type {
  SchoolGradeRow,
  SchoolSectionRow,
  SchoolSubjectRow,
} from "@/features/schools/academic/queries";
import { printElement } from "@/features/schools/print/print-element";
import type { SchoolTeacherRow } from "@/features/schools/teachers/queries";
import {
  type SchoolTimetableActionState,
  createSchoolRoomAction,
  createSchoolTimetableEntryAction,
  deleteSchoolTimetableEntryAction,
  updateSchoolTimetableEntryAction,
} from "@/features/schools/timetable/actions";
import type {
  SchoolRoomRow,
  SchoolTimetableEntryRow,
} from "@/features/schools/timetable/queries";
import {
  TIMETABLE_DAYS,
  findTimetableConflict,
  timetableConflictMessage,
} from "@/features/schools/timetable/validate";
import { SchoolLogo } from "@/features/schools/ui/school-logo";

const initial: SchoolTimetableActionState = { error: null, success: null };

type ViewMode = "class" | "teacher";

type Props = {
  schoolId: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  teachers: SchoolTeacherRow[];
  rooms: SchoolRoomRow[];
  entries: SchoolTimetableEntryRow[];
  canManage: boolean;
  initialSectionId?: string;
  initialTeacherId?: string;
};

function sectionLabel(
  section: SchoolSectionRow,
  gradeName: Map<string, string>,
): string {
  return `${gradeName.get(section.gradeId) ?? "Class"} · ${section.name}`;
}

function teacherLabel(teacher: SchoolTeacherRow): string {
  return `${teacher.firstName} ${teacher.lastName}`;
}

export function SchoolTimetablePanel({
  schoolId,
  schoolName,
  schoolLogoUrl = null,
  grades,
  sections,
  subjects,
  teachers,
  rooms,
  entries,
  canManage,
  initialSectionId = "",
  initialTeacherId = "",
}: Props) {
  const printRef = useRef<HTMLElement>(null);

  const [createState, createAction, createPending] = useActionState(
    createSchoolTimetableEntryAction,
    initial,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateSchoolTimetableEntryAction,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSchoolTimetableEntryAction,
    initial,
  );
  const [roomState, roomAction, roomPending] = useActionState(
    createSchoolRoomAction,
    initial,
  );

  const createDialog = useActionDialog(createState);
  const editDialog = useActionDialog(updateState);
  const deleteDialog = useActionDialog(deleteState);
  const roomDialog = useActionDialog(roomState);

  const activeSections = sections.filter((s) => s.status === "active");
  const activeSubjects = subjects.filter((s) => s.status === "active");
  const activeTeachers = teachers.filter((t) => t.status === "active");
  const activeRooms = rooms.filter((r) => r.status === "active");

  const gradeName = useMemo(
    () => new Map(grades.map((g) => [g.id, g.name])),
    [grades],
  );
  const sectionById = useMemo(
    () => new Map(sections.map((s) => [s.id, s])),
    [sections],
  );
  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const teacherById = useMemo(
    () => new Map(teachers.map((t) => [t.id, t])),
    [teachers],
  );
  const roomById = useMemo(
    () => new Map(rooms.map((r) => [r.id, r])),
    [rooms],
  );

  const defaultSectionId =
    initialSectionId ||
    activeSections.find((s) => s.status === "active")?.id ||
    "";
  const defaultTeacherId =
    initialTeacherId || activeTeachers[0]?.id || "";

  const [viewMode, setViewMode] = useState<ViewMode>(
    initialTeacherId ? "teacher" : "class",
  );
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [teacherId, setTeacherId] = useState(defaultTeacherId);
  const [editing, setEditing] = useState<SchoolTimetableEntryRow | null>(null);
  const [deleting, setDeleting] = useState<SchoolTimetableEntryRow | null>(
    null,
  );
  const [createPrefill, setCreatePrefill] = useState({
    dayOfWeek: "1",
    startsAt: "08:00",
    endsAt: "08:45",
  });
  const [createKey, setCreateKey] = useState(0);

  const visibleEntries = useMemo(() => {
    if (viewMode === "class") {
      return entries.filter((e) => e.sectionId === sectionId);
    }
    return entries.filter((e) => e.teacherId === teacherId);
  }, [entries, viewMode, sectionId, teacherId]);

  const titleLabel =
    viewMode === "class"
      ? (() => {
          const section = sectionById.get(sectionId);
          return section
            ? sectionLabel(section, gradeName)
            : "Select a class";
        })()
      : (() => {
          const teacher = teacherById.get(teacherId);
          return teacher ? teacherLabel(teacher) : "Select a teacher";
        })();

  function openCreate(day?: number, startsAt?: string) {
    setEditing(null);
    setCreatePrefill({
      dayOfWeek: day != null ? String(day) : "1",
      startsAt: startsAt ?? "08:00",
      endsAt: "08:45",
    });
    setCreateKey((k) => k + 1);
    createDialog.openDialog();
  }

  function openEdit(entry: SchoolTimetableEntryRow) {
    setEditing(entry);
    editDialog.openDialog();
  }

  function openDelete(entry: SchoolTimetableEntryRow) {
    setDeleting(entry);
    deleteDialog.openDialog();
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElement(printRef.current, `Timetable · ${titleLabel} · ${schoolName}`);
  }

  function handleExportCsv() {
    const rows = [
      [
        "Day",
        "Starts",
        "Ends",
        "Subject",
        "Class",
        "Teacher",
        "Room",
        "Notes",
      ],
      ...visibleEntries
        .slice()
        .sort(
          (a, b) =>
            a.dayOfWeek - b.dayOfWeek || a.startsAt.localeCompare(b.startsAt),
        )
        .map((entry) => {
          const section = sectionById.get(entry.sectionId);
          const subject = subjectById.get(entry.subjectId);
          const teacher = teacherById.get(entry.teacherId);
          const room = entry.roomId ? roomById.get(entry.roomId) : null;
          const day =
            TIMETABLE_DAYS.find((d) => d.value === entry.dayOfWeek)?.label ??
            String(entry.dayOfWeek);
          return [
            day,
            entry.startsAt,
            entry.endsAt,
            subject?.name ?? "",
            section ? sectionLabel(section, gradeName) : "",
            teacher ? teacherLabel(teacher) : "",
            room?.name ?? "",
            entry.notes ?? "",
          ];
        }),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = titleLabel.replace(/[^\w.-]+/g, "_").slice(0, 40);
    anchor.href = url;
    anchor.download = `timetable-${safeName || "export"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <SchoolLogo
            schoolName={schoolName}
            logoUrl={schoolLogoUrl}
            size="sm"
          />
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
              {schoolName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Timetable
            </h1>
            <p className="mt-1 text-sm text-muted">
              Weekly lesson schedule by class or teacher.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={visibleEntries.length === 0}
            className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink"
          >
            Print
          </button>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={roomDialog.openDialog}
                className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink"
              >
                Add classroom
              </button>
              <button
                type="button"
                onClick={() => openCreate()}
                className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white"
              >
                Add period
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="Timetable view"
          className="flex rounded-md border border-line bg-paper-elevated p-0.5"
        >
          <button
            type="button"
            onClick={() => setViewMode("class")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              viewMode === "class"
                ? "bg-teal text-white"
                : "text-ink hover:bg-paper"
            }`}
          >
            Class
          </button>
          <button
            type="button"
            onClick={() => setViewMode("teacher")}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              viewMode === "teacher"
                ? "bg-teal text-white"
                : "text-ink hover:bg-paper"
            }`}
          >
            Teacher
          </button>
        </div>

        {viewMode === "class" ? (
          <label className="block text-sm">
            <span className="text-muted">Class / section</span>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="mt-1 block min-w-[14rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
            >
              <option value="">Select section</option>
              {activeSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {sectionLabel(section, gradeName)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-muted">Teacher</span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="mt-1 block min-w-[14rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
            >
              <option value="">Select teacher</option>
              {activeTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacherLabel(teacher)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <article
        ref={printRef}
        className="school-print-face mt-6 overflow-x-auto rounded-2xl border border-line bg-paper-elevated"
      >
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Weekly timetable
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{titleLabel}</p>
          <p className="text-xs text-muted">{schoolName}</p>
        </div>

        {!sectionId && viewMode === "class" ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Choose a class section to view its weekly schedule.
          </p>
        ) : !teacherId && viewMode === "teacher" ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Choose a teacher to view their teaching schedule.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-3 font-medium">Time</th>
                {TIMETABLE_DAYS.map((day) => (
                  <th key={day.value} className="px-3 py-3 font-medium">
                    {day.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td className="border-r border-line/70 px-3 py-3 text-xs text-muted">
                  Periods
                </td>
                {TIMETABLE_DAYS.map((day) => {
                  const dayEntries = visibleEntries
                    .filter((e) => e.dayOfWeek === day.value)
                    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
                  return (
                    <td
                      key={day.value}
                      className="min-w-[9rem] border-r border-line/70 px-2 py-2 last:border-r-0"
                    >
                      <ul className="space-y-2">
                        {dayEntries.length === 0 ? (
                          <li className="px-1 py-6 text-center text-xs text-muted">
                            —
                            {canManage && viewMode === "class" && sectionId ? (
                              <button
                                type="button"
                                onClick={() => openCreate(day.value, "08:00")}
                                className="school-print-screen-only mt-2 block w-full text-teal hover:underline"
                              >
                                + Add
                              </button>
                            ) : null}
                          </li>
                        ) : (
                          dayEntries.map((entry) => {
                            const subject = subjectById.get(entry.subjectId);
                            const teacher = teacherById.get(entry.teacherId);
                            const room = entry.roomId
                              ? roomById.get(entry.roomId)
                              : null;
                            const section = sectionById.get(entry.sectionId);
                            return (
                              <li
                                key={entry.id}
                                className="rounded-xl border border-line bg-paper px-2.5 py-2"
                              >
                                <p className="text-xs font-medium text-teal">
                                  {entry.startsAt}–{entry.endsAt}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-ink">
                                  {subject?.name ?? "Subject"}
                                </p>
                                <p className="text-xs text-muted">
                                  {viewMode === "class"
                                    ? teacher
                                      ? teacherLabel(teacher)
                                      : "Teacher"
                                    : section
                                      ? sectionLabel(section, gradeName)
                                      : "Class"}
                                  {room ? ` · ${room.name}` : ""}
                                </p>
                                {canManage ? (
                                  <div className="school-print-screen-only mt-2 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openEdit(entry)}
                                      className="text-xs font-medium text-teal hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openDelete(entry)}
                                      className="text-xs text-muted hover:underline"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </article>

      {visibleEntries.length === 0 &&
      ((viewMode === "class" && sectionId) ||
        (viewMode === "teacher" && teacherId)) ? (
        <p className="mt-3 text-sm text-muted">
          No periods scheduled yet
          {canManage ? " — add the first lesson to build the week." : "."}
        </p>
      ) : null}

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="Add period"
        description="Assign subject, teacher, day, and time. Overlaps for the same class, teacher, or room are blocked."
        submitLabel="Add period"
        formAction={createAction}
        busy={createPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={createState.error}
      >
        <PeriodFields
          key={`create-${createKey}`}
          schoolId={schoolId}
          idPrefix="tt-create"
          sections={activeSections}
          subjects={activeSubjects}
          teachers={activeTeachers}
          rooms={activeRooms}
          gradeName={gradeName}
          defaultSectionId={viewMode === "class" ? sectionId : ""}
          defaultTeacherId={viewMode === "teacher" ? teacherId : ""}
          defaultDayOfWeek={createPrefill.dayOfWeek}
          defaultStartsAt={createPrefill.startsAt}
          defaultEndsAt={createPrefill.endsAt}
          entries={entries}
        />
      </FormDialog>

      <FormDialog
        open={editDialog.open && editing !== null}
        onClose={() => {
          editDialog.closeDialog();
          setEditing(null);
        }}
        title="Edit period"
        description="Update this lesson. Conflicts are checked before saving."
        submitLabel="Save period"
        formAction={updateAction}
        busy={updatePending}
        dirty={editDialog.dirty}
        onDirtyChange={editDialog.setDirty}
        error={updateState.error}
      >
        <input type="hidden" name="entry_id" value={editing?.id ?? ""} />
        {editing ? (
          <PeriodFields
            key={editing.id}
            schoolId={schoolId}
            idPrefix="tt-edit"
            sections={activeSections}
            subjects={activeSubjects}
            teachers={activeTeachers}
            rooms={activeRooms}
            gradeName={gradeName}
            defaultSectionId={editing.sectionId}
            defaultSubjectId={editing.subjectId}
            defaultTeacherId={editing.teacherId}
            defaultRoomId={editing.roomId ?? ""}
            defaultDayOfWeek={String(editing.dayOfWeek)}
            defaultStartsAt={editing.startsAt}
            defaultEndsAt={editing.endsAt}
            defaultNotes={editing.notes ?? ""}
            entries={entries}
            editingId={editing.id}
          />
        ) : null}
      </FormDialog>

      <FormDialog
        open={deleteDialog.open && deleting !== null}
        onClose={() => {
          deleteDialog.closeDialog();
          setDeleting(null);
        }}
        title="Remove period"
        description="Remove this lesson from the weekly timetable?"
        submitLabel="Remove period"
        formAction={deleteAction}
        busy={deletePending}
        error={deleteState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="entry_id" value={deleting?.id ?? ""} />
      </FormDialog>

      <FormDialog
        open={roomDialog.open}
        onClose={roomDialog.closeDialog}
        title="Add classroom"
        description="Create a named room for timetable conflict checks."
        submitLabel="Create classroom"
        formAction={roomAction}
        busy={roomPending}
        dirty={roomDialog.dirty}
        onDirtyChange={roomDialog.setDirty}
        error={roomState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="tt-room-name"
          name="name"
          label="Classroom name"
          required
          placeholder="Room 12"
        />
      </FormDialog>
    </div>
  );
}

function PeriodFields({
  schoolId,
  idPrefix,
  sections,
  subjects,
  teachers,
  rooms,
  gradeName,
  defaultSectionId = "",
  defaultSubjectId = "",
  defaultTeacherId = "",
  defaultRoomId = "",
  defaultDayOfWeek = "1",
  defaultStartsAt = "08:00",
  defaultEndsAt = "08:45",
  defaultNotes = "",
  entries,
  editingId,
}: {
  schoolId: string;
  idPrefix: string;
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  teachers: SchoolTeacherRow[];
  rooms: SchoolRoomRow[];
  gradeName: Map<string, string>;
  defaultSectionId?: string;
  defaultSubjectId?: string;
  defaultTeacherId?: string;
  defaultRoomId?: string;
  defaultDayOfWeek?: string;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  defaultNotes?: string;
  entries: SchoolTimetableEntryRow[];
  editingId?: string;
}) {
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [teacherId, setTeacherId] = useState(defaultTeacherId);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [dayOfWeek, setDayOfWeek] = useState(defaultDayOfWeek);
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);

  const conflict = useMemo(() => {
    if (!sectionId || !teacherId || !dayOfWeek || !startsAt || !endsAt) {
      return null;
    }
    return findTimetableConflict(entries, {
      id: editingId,
      sectionId,
      teacherId,
      roomId: roomId || null,
      dayOfWeek: Number(dayOfWeek),
      startsAt,
      endsAt,
    });
  }, [
    entries,
    editingId,
    sectionId,
    teacherId,
    roomId,
    dayOfWeek,
    startsAt,
    endsAt,
  ]);

  return (
    <>
      <input type="hidden" name="school_id" value={schoolId} />
      <label className="block text-sm">
        <span className="text-muted">Class / section</span>
        <select
          name="section_id"
          required
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="">Select section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {sectionLabel(section, gradeName)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">Subject</span>
        <select
          name="subject_id"
          required
          defaultValue={defaultSubjectId}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="">Select subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
              {subject.code ? ` (${subject.code})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">Teacher</span>
        <select
          name="teacher_id"
          required
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="">Select teacher</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacherLabel(teacher)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">Classroom (optional)</span>
        <select
          name="room_id"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          <option value="">No room</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">Day</span>
        <select
          id={`${idPrefix}-day`}
          name="day_of_week"
          required
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
        >
          {TIMETABLE_DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-muted">Starts</span>
          <input
            id={`${idPrefix}-start`}
            type="time"
            name="starts_at"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Ends</span>
          <input
            type="time"
            name="ends_at"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink"
          />
        </label>
      </div>
      <DialogField
        id={`${idPrefix}-notes`}
        name="notes"
        label="Notes (optional)"
        defaultValue={defaultNotes}
      />
      {conflict ? (
        <p role="status" className="text-sm text-amber-800">
          {timetableConflictMessage(conflict)}
        </p>
      ) : null}
    </>
  );
}
