"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
  isSchoolManagerRole,
} from "@/features/schools/authorization";
import {
  validateCreateExaminationInput,
  validateExamMarkInput,
  validateExamPaperInput,
} from "@/features/schools/exams/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolExamActionState = {
  error: string | null;
  success: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateExams(schoolId: string) {
  revalidatePath("/school/exams");
  revalidatePath(`/school/exams?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/exams?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

function mapError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("Not authorized")) {
    return "You are not allowed to manage examinations.";
  }
  if (message.includes("Published results are locked")) {
    return message;
  }
  if (message.includes("duplicate key") || message.includes("unique")) {
    return "That subject is already added for this class section.";
  }
  return message;
}

export async function createSchoolExaminationAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const validated = validateCreateExaminationInput({
    schoolId: String(formData.get("school_id") ?? ""),
    academicYearId: String(formData.get("academic_year_id") ?? ""),
    academicTermId: String(formData.get("academic_term_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    examType: String(formData.get("exam_type") ?? ""),
    startsOn: String(formData.get("starts_on") ?? ""),
    endsOn: String(formData.get("ends_on") ?? ""),
    publishRanks: String(formData.get("publish_ranks") ?? "true"),
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(validated.value.schoolId);
  try {
    const membership = await authorizeSchool(
      supabase,
      user.id,
      validated.value.schoolId,
      "exam.manage",
    );
    if (!isSchoolManagerRole(membership.role)) {
      return {
        error: "Only school administrators can create examinations.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("create_school_examination", {
    p_school_id: validated.value.schoolId,
    p_academic_year_id: validated.value.academicYearId,
    p_academic_term_id: validated.value.academicTermId,
    p_name: validated.value.name,
    p_exam_type: validated.value.examType,
    p_starts_on: validated.value.startsOn,
    p_ends_on: validated.value.endsOn,
    p_publish_ranks: validated.value.publishRanks,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not create examination."),
      success: null,
    };
  }

  revalidateExams(validated.value.schoolId);
  return { error: null, success: "Examination created." };
}

export async function addSchoolExamPaperAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateExamPaperInput({
    examinationId: String(formData.get("examination_id") ?? ""),
    gradeId: String(formData.get("grade_id") ?? ""),
    sectionId: String(formData.get("section_id") ?? ""),
    subjectId: String(formData.get("subject_id") ?? ""),
    maxMarks: String(formData.get("max_marks") ?? ""),
    passMarks: String(formData.get("pass_marks") ?? ""),
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    const membership = await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "exam.manage",
    );
    if (!isSchoolManagerRole(membership.role)) {
      return {
        error: "Only school administrators can configure exam subjects.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("add_school_exam_paper", {
    p_examination_id: validated.value.examinationId,
    p_grade_id: validated.value.gradeId,
    p_section_id: validated.value.sectionId,
    p_subject_id: validated.value.subjectId,
    p_max_marks: validated.value.maxMarks,
    p_pass_marks: validated.value.passMarks,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not add subject paper."),
      success: null,
    };
  }

  revalidateExams(schoolId);
  return { error: null, success: "Subject added to examination." };
}

export async function upsertSchoolExamMarkAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const maxMarks = Number(formData.get("max_marks") ?? "0");
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null };
  }

  const validated = validateExamMarkInput({
    paperId: String(formData.get("paper_id") ?? ""),
    studentId: String(formData.get("student_id") ?? ""),
    attendanceStatus: String(formData.get("attendance_status") ?? "present"),
    marksObtained: String(formData.get("marks_obtained") ?? ""),
    remarks: String(formData.get("remarks") ?? ""),
    maxMarks,
  });
  if (!validated.ok) return { error: validated.error, success: null };

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "exam.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("upsert_school_exam_mark", {
    p_paper_id: validated.value.paperId,
    p_student_id: validated.value.studentId,
    p_attendance_status: validated.value.attendanceStatus,
    p_marks_obtained: validated.value.marksObtained,
    p_remarks: validated.value.remarks,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not save marks."),
      success: null,
    };
  }

  revalidateExams(schoolId);
  return { error: null, success: "Marks saved." };
}

export async function publishSchoolExaminationAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const examinationId = String(formData.get("examination_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(examinationId)) {
    return { error: "Examination is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    const membership = await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "exam.manage",
    );
    if (!isSchoolManagerRole(membership.role)) {
      return {
        error: "Only school administrators can publish results.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("publish_school_examination", {
    p_examination_id: examinationId,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not publish results."),
      success: null,
    };
  }

  revalidateExams(schoolId);
  return { error: null, success: "Results published." };
}

export async function unpublishSchoolExaminationAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const examinationId = String(formData.get("examination_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(examinationId)) {
    return { error: "Examination is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    const membership = await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "exam.manage",
    );
    if (!isSchoolManagerRole(membership.role)) {
      return {
        error: "Only school administrators can unpublish results.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("unpublish_school_examination", {
    p_examination_id: examinationId,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not unpublish results."),
      success: null,
    };
  }

  revalidateExams(schoolId);
  return { error: null, success: "Examination reopened for corrections." };
}

export async function deleteSchoolExamPaperAction(
  _prev: SchoolExamActionState,
  formData: FormData,
): Promise<SchoolExamActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const paperId = String(formData.get("paper_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(paperId)) {
    return { error: "Subject paper is required.", success: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    const membership = await authorizeSchool(
      supabase,
      user.id,
      schoolId,
      "exam.manage",
    );
    if (!isSchoolManagerRole(membership.role)) {
      return {
        error: "Only school administrators can remove exam subjects.",
        success: null,
      };
    }
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const { error } = await supabase.rpc("delete_school_exam_paper", {
    p_paper_id: paperId,
  });

  if (error) {
    return {
      error: mapError(error.message, "Could not remove subject."),
      success: null,
    };
  }

  revalidateExams(schoolId);
  return { error: null, success: "Subject removed from examination." };
}
