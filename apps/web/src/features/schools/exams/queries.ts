import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolGradingScaleRow = {
  id: string;
  schoolId: string;
  name: string;
  isDefault: boolean;
  status: string;
};

export type SchoolGradingBandRow = {
  id: string;
  schoolId: string;
  scaleId: string;
  minPercent: number;
  maxPercent: number;
  gradeLabel: string;
  isPass: boolean;
  sortOrder: number;
};

export type SchoolExaminationRow = {
  id: string;
  schoolId: string;
  academicYearId: string;
  academicTermId: string | null;
  gradingScaleId: string;
  name: string;
  examType: string;
  startsOn: string | null;
  endsOn: string | null;
  status: string;
  publishRanks: boolean;
  publishedAt: string | null;
};

export type SchoolExamPaperRow = {
  id: string;
  schoolId: string;
  examinationId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
};

export type SchoolExamMarkRow = {
  id: string;
  schoolId: string;
  paperId: string;
  studentId: string;
  marksObtained: number | null;
  attendanceStatus: string;
  remarks: string | null;
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function listSchoolGradingScales(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolGradingScaleRow[]> {
  const { data, error } = await supabase
    .from("school_grading_scales")
    .select("id, school_id, name, is_default, status")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw new Error("Could not load grading scales.");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    isDefault: Boolean(row.is_default),
    status: row.status,
  }));
}

export async function listSchoolGradingBands(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolGradingBandRow[]> {
  const { data, error } = await supabase
    .from("school_grading_bands")
    .select(
      "id, school_id, scale_id, min_percent, max_percent, grade_label, is_pass, sort_order",
    )
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Could not load grading bands.");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    scaleId: row.scale_id,
    minPercent: num(row.min_percent),
    maxPercent: num(row.max_percent),
    gradeLabel: row.grade_label,
    isPass: Boolean(row.is_pass),
    sortOrder: Number(row.sort_order),
  }));
}

export async function listSchoolExaminations(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolExaminationRow[]> {
  const { data, error } = await supabase
    .from("school_examinations")
    .select(
      "id, school_id, academic_year_id, academic_term_id, grading_scale_id, name, exam_type, starts_on, ends_on, status, publish_ranks, published_at",
    )
    .eq("school_id", schoolId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load examinations.");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    academicYearId: row.academic_year_id,
    academicTermId: row.academic_term_id,
    gradingScaleId: row.grading_scale_id,
    name: row.name,
    examType: row.exam_type,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    publishRanks: Boolean(row.publish_ranks),
    publishedAt: row.published_at,
  }));
}

export async function listSchoolExamPapers(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolExamPaperRow[]> {
  const { data, error } = await supabase
    .from("school_exam_papers")
    .select(
      "id, school_id, examination_id, grade_id, section_id, subject_id, max_marks, pass_marks",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) throw new Error("Could not load exam papers.");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    examinationId: row.examination_id,
    gradeId: row.grade_id,
    sectionId: row.section_id,
    subjectId: row.subject_id,
    maxMarks: num(row.max_marks),
    passMarks: num(row.pass_marks),
  }));
}

export async function listSchoolExamMarks(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<SchoolExamMarkRow[]> {
  const { data, error } = await supabase
    .from("school_exam_marks")
    .select(
      "id, school_id, paper_id, student_id, marks_obtained, attendance_status, remarks",
    )
    .eq("school_id", schoolId);

  if (error) throw new Error("Could not load exam marks.");

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    paperId: row.paper_id,
    studentId: row.student_id,
    marksObtained:
      row.marks_obtained == null ? null : num(row.marks_obtained),
    attendanceStatus: row.attendance_status,
    remarks: row.remarks,
  }));
}
