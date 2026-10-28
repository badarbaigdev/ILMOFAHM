import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolRoomRow = {
  id: string;
  schoolId: string;
  name: string;
  status: string;
};

export type SchoolTimetableEntryRow = {
  id: string;
  schoolId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  roomId: string | null;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  status: string;
};

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "00:00";
  // Postgres time may arrive as HH:MM:SS
  return value.slice(0, 5);
}

export async function listSchoolRooms(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolRoomRow[]> {
  const { data, error } = await supabase
    .from("school_rooms")
    .select("id, school_id, name, status")
    .eq("school_id", schoolId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load classrooms.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    status: row.status,
  }));
}

export async function listSchoolTimetableEntries(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolTimetableEntryRow[]> {
  const { data, error } = await supabase
    .from("school_timetable_entries")
    .select(
      "id, school_id, section_id, subject_id, teacher_id, room_id, day_of_week, starts_at, ends_at, notes, status",
    )
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("day_of_week", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error("Could not load timetable entries.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    sectionId: row.section_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    roomId: row.room_id,
    dayOfWeek: Number(row.day_of_week),
    startsAt: normalizeTime(row.starts_at),
    endsAt: normalizeTime(row.ends_at),
    notes: row.notes,
    status: row.status,
  }));
}
