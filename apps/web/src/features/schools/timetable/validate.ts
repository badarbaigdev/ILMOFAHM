export const TIMETABLE_DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export type TimetableDayValue = (typeof TIMETABLE_DAYS)[number]["value"];

export type TimetableEntryInput = {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomId: string | null;
  dayOfWeek: TimetableDayValue;
  startsAt: string;
  endsAt: string;
  notes: string | null;
};

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function normalizeTime(raw: string): string | null {
  const trimmed = raw.trim();
  const match = TIME_RE.exec(trimmed);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function timesOverlap(
  startsA: string,
  endsA: string,
  startsB: string,
  endsB: string,
): boolean {
  return (
    timeToMinutes(startsA) < timeToMinutes(endsB) &&
    timeToMinutes(endsA) > timeToMinutes(startsB)
  );
}

export function validateTimetableEntryInput(raw: {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: string;
  startsAt: string;
  endsAt: string;
  notes: string;
}): ValidateResult<TimetableEntryInput> {
  const sectionId = raw.sectionId.trim();
  const subjectId = raw.subjectId.trim();
  const teacherId = raw.teacherId.trim();
  const roomRaw = raw.roomId.trim();
  const roomId = roomRaw ? roomRaw : null;

  if (!UUID_RE.test(sectionId)) {
    return { ok: false, error: "Select a class section." };
  }
  if (!UUID_RE.test(subjectId)) {
    return { ok: false, error: "Select a subject." };
  }
  if (!UUID_RE.test(teacherId)) {
    return { ok: false, error: "Select a teacher." };
  }
  if (roomId && !UUID_RE.test(roomId)) {
    return { ok: false, error: "Select a valid classroom." };
  }

  const day = Number.parseInt(raw.dayOfWeek.trim(), 10);
  if (!Number.isInteger(day) || day < 1 || day > 6) {
    return { ok: false, error: "Select a weekday (Monday–Saturday)." };
  }

  const startsAt = normalizeTime(raw.startsAt);
  const endsAt = normalizeTime(raw.endsAt);
  if (!startsAt || !endsAt) {
    return { ok: false, error: "Enter valid start and end times (HH:MM)." };
  }
  if (timeToMinutes(endsAt) <= timeToMinutes(startsAt)) {
    return { ok: false, error: "End time must be after start time." };
  }

  const notesRaw = raw.notes.trim();
  if (notesRaw.length > 500) {
    return { ok: false, error: "Notes must be 500 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      sectionId,
      subjectId,
      teacherId,
      roomId,
      dayOfWeek: day as TimetableDayValue,
      startsAt,
      endsAt,
      notes: notesRaw || null,
    },
  };
}

export type TimetableConflictKind = "section" | "teacher" | "room";

export type TimetableConflictCheckEntry = {
  id: string;
  sectionId: string;
  teacherId: string;
  roomId: string | null;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

/** Client-side conflict preview (server still enforces). */
export function findTimetableConflict(
  entries: TimetableConflictCheckEntry[],
  candidate: {
    id?: string | null;
    sectionId: string;
    teacherId: string;
    roomId: string | null;
    dayOfWeek: number;
    startsAt: string;
    endsAt: string;
  },
): TimetableConflictKind | null {
  for (const entry of entries) {
    if (entry.status !== "active") continue;
    if (candidate.id && entry.id === candidate.id) continue;
    if (entry.dayOfWeek !== candidate.dayOfWeek) continue;
    if (
      !timesOverlap(
        entry.startsAt,
        entry.endsAt,
        candidate.startsAt,
        candidate.endsAt,
      )
    ) {
      continue;
    }
    if (entry.sectionId === candidate.sectionId) return "section";
    if (entry.teacherId === candidate.teacherId) return "teacher";
    if (
      candidate.roomId &&
      entry.roomId &&
      entry.roomId === candidate.roomId
    ) {
      return "room";
    }
  }
  return null;
}

export function timetableConflictMessage(
  kind: TimetableConflictKind,
): string {
  switch (kind) {
    case "section":
      return "This class already has a lesson overlapping that time.";
    case "teacher":
      return "This teacher already has a lesson overlapping that time.";
    case "room":
      return "This classroom is already booked overlapping that time.";
  }
}
