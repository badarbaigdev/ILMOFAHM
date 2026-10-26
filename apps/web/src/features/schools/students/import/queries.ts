import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SchoolStudentImportBatchRow = {
  id: string;
  schoolId: string;
  filename: string;
  status: string;
  rowCount: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  importedCount: number;
  skippedCount: number;
  createdAt: string;
  committedAt: string | null;
};

export type SchoolStudentImportRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  studentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  validationStatus: string;
  errorMessage: string | null;
};

export async function listSchoolStudentImportBatches(
  supabase: SupabaseClient,
  schoolId: string,
  limit = 10,
): Promise<SchoolStudentImportBatchRow[]> {
  const { data, error } = await supabase
    .from("school_student_import_batches")
    .select(
      "id, school_id, filename, status, row_count, valid_count, error_count, duplicate_count, imported_count, skipped_count, created_at, committed_at",
    )
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Could not load import batches.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    filename: row.filename,
    status: row.status,
    rowCount: row.row_count,
    validCount: row.valid_count,
    errorCount: row.error_count,
    duplicateCount: row.duplicate_count,
    importedCount: row.imported_count,
    skippedCount: row.skipped_count,
    createdAt: row.created_at,
    committedAt: row.committed_at,
  }));
}

export async function listSchoolStudentImportRows(
  supabase: SupabaseClient,
  batchId: string,
): Promise<SchoolStudentImportRow[]> {
  const { data, error } = await supabase
    .from("school_student_import_rows")
    .select(
      "id, batch_id, row_number, student_number, first_name, last_name, validation_status, error_message",
    )
    .eq("batch_id", batchId)
    .order("row_number", { ascending: true });

  if (error) {
    throw new Error("Could not load import rows.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    rowNumber: row.row_number,
    studentNumber: row.student_number,
    firstName: row.first_name,
    lastName: row.last_name,
    validationStatus: row.validation_status,
    errorMessage: row.error_message,
  }));
}
