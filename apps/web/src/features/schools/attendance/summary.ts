import type { AttendanceStatus } from "./validate";
import {
  ATTENDANCE_STATUSES,
  PRIMARY_ATTENDANCE_STATUSES,
} from "./validate";

export type AttendanceMarkLike = {
  status: string;
};

export type AttendanceSessionLike = {
  status: string;
  attendanceDate: string;
};

export type AttendanceStatusCounts = Record<AttendanceStatus, number> & {
  total: number;
};

export type SchoolAttendanceDaySummary = {
  date: string;
  draftSessions: number;
  submittedSessions: number;
  markedStudents: number;
  byStatus: AttendanceStatusCounts;
  presentRate: number | null;
};

function emptyCounts(): AttendanceStatusCounts {
  return {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    half_day: 0,
    leave: 0,
    total: 0,
  };
}

export function countAttendanceStatuses(
  marks: AttendanceMarkLike[],
): AttendanceStatusCounts {
  const counts = emptyCounts();
  for (const mark of marks) {
    const status = mark.status as AttendanceStatus;
    if (ATTENDANCE_STATUSES.includes(status)) {
      counts[status] += 1;
    }
    counts.total += 1;
  }
  return counts;
}

export function summarizeSchoolAttendanceDay(input: {
  date: string;
  sessions: AttendanceSessionLike[];
  marks: AttendanceMarkLike[];
}): SchoolAttendanceDaySummary {
  const daySessions = input.sessions.filter(
    (s) => s.attendanceDate === input.date,
  );
  const byStatus = countAttendanceStatuses(input.marks);
  const attended = byStatus.present + byStatus.late + byStatus.half_day;
  return {
    date: input.date,
    draftSessions: daySessions.filter((s) => s.status === "draft").length,
    submittedSessions: daySessions.filter((s) => s.status === "submitted")
      .length,
    markedStudents: byStatus.total,
    byStatus,
    presentRate:
      byStatus.total > 0
        ? Math.round((attended / byStatus.total) * 100)
        : null,
  };
}

export function primaryStatusEntries(
  counts: AttendanceStatusCounts,
): Array<{ status: AttendanceStatus; value: number }> {
  return PRIMARY_ATTENDANCE_STATUSES.map((status) => ({
    status,
    value: counts[status],
  }));
}
