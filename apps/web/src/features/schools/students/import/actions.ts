"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { parseStudentImportCsv } from "@/features/schools/students/import/parse-csv";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SchoolStudentImportActionState = {
  error: string | null;
  success: string | null;
  batchId: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateStudents(schoolId: string) {
  revalidatePath("/school/students");
  revalidatePath(`/school/students?school=${schoolId}`);
  revalidatePath("/school");
}

async function requireUser(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/school/students?school=${schoolId}`)}`,
    );
  }
  return { supabase, user };
}

export async function dryRunSchoolStudentImportAction(
  _prev: SchoolStudentImportActionState,
  formData: FormData,
): Promise<SchoolStudentImportActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!isUuid(schoolId)) {
    return { error: "School is required.", success: null, batchId: null };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Choose a CSV file to import.",
      success: null,
      batchId: null,
    };
  }

  const filename = file.name.trim() || "students.csv";
  if (!filename.toLowerCase().endsWith(".csv")) {
    return {
      error: "Upload a .csv file (Excel: File → Save As → CSV).",
      success: null,
      batchId: null,
    };
  }
  if (file.size > 1_000_000) {
    return {
      error: "CSV must be 1 MB or smaller.",
      success: null,
      batchId: null,
    };
  }

  const text = await file.text();
  const parsed = parseStudentImportCsv(text);
  if (!parsed.ok) {
    return { error: parsed.error, success: null, batchId: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "student.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null, batchId: null };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc(
    "create_school_student_import_dry_run",
    {
      p_school_id: schoolId,
      p_filename: filename.slice(0, 255),
      p_rows: parsed.rows.map((row) => ({
        row_number: row.rowNumber,
        student_number: row.studentNumber,
        first_name: row.firstName,
        last_name: row.lastName,
        date_of_birth: row.dateOfBirth || null,
        gender: row.gender || null,
        academic_year_name: row.academicYearName || null,
        grade_name: row.gradeName || null,
        section_name: row.sectionName || null,
      })),
    },
  );

  if (error) {
    return {
      error: error.message || "Could not validate import.",
      success: null,
      batchId: null,
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const batchId =
    result && typeof result === "object" && "batch_id" in result
      ? String((result as { batch_id: string }).batch_id)
      : null;

  revalidateStudents(schoolId);
  if (batchId) {
    redirect(
      `/school/students?school=${encodeURIComponent(schoolId)}&import=${encodeURIComponent(batchId)}`,
    );
  }

  return {
    error: null,
    success: "Dry-run complete.",
    batchId,
  };
}

export async function commitSchoolStudentImportAction(
  _prev: SchoolStudentImportActionState,
  formData: FormData,
): Promise<SchoolStudentImportActionState> {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const batchId = String(formData.get("batch_id") ?? "").trim();
  if (!isUuid(schoolId) || !isUuid(batchId)) {
    return { error: "Import batch is required.", success: null, batchId: null };
  }

  const { supabase, user } = await requireUser(schoolId);
  try {
    await authorizeSchool(supabase, user.id, schoolId, "student.manage");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return { error: error.message, success: null, batchId };
    }
    throw error;
  }

  const { data, error } = await supabase.rpc(
    "commit_school_student_import_batch",
    { p_batch_id: batchId },
  );
  if (error) {
    return {
      error: error.message || "Could not commit import.",
      success: null,
      batchId,
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  const imported =
    result && typeof result === "object" && "imported_count" in result
      ? Number((result as { imported_count: number }).imported_count)
      : 0;

  revalidateStudents(schoolId);
  return {
    error: null,
    success: `Imported ${imported} student${imported === 1 ? "" : "s"}.`,
    batchId,
  };
}
