"use client";

import { useActionState } from "react";

import {
  type SchoolStudentImportActionState,
  commitSchoolStudentImportAction,
  dryRunSchoolStudentImportAction,
} from "@/features/schools/students/import/actions";
import { STUDENT_IMPORT_TEMPLATE_CSV } from "@/features/schools/students/import/parse-csv";
import type {
  SchoolStudentImportBatchRow,
  SchoolStudentImportRow,
} from "@/features/schools/students/import/queries";

const initial: SchoolStudentImportActionState = {
  error: null,
  success: null,
  batchId: null,
};

type Props = {
  schoolId: string;
  batches: SchoolStudentImportBatchRow[];
  activeBatch: SchoolStudentImportBatchRow | null;
  activeRows: SchoolStudentImportRow[];
  canManage: boolean;
};

export function SchoolStudentImportPanel({
  schoolId,
  batches,
  activeBatch,
  activeRows,
  canManage,
}: Props) {
  const [dryRunState, dryRunAction, dryRunPending] = useActionState(
    dryRunSchoolStudentImportAction,
    initial,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitSchoolStudentImportAction,
    initial,
  );

  function downloadTemplate() {
    const blob = new Blob([STUDENT_IMPORT_TEMPLATE_CSV + "\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ilmofahm-student-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadErrorReport() {
    if (!activeBatch || activeRows.length === 0) return;
    const problemRows = activeRows.filter(
      (row) =>
        row.validationStatus === "error" ||
        row.validationStatus === "duplicate",
    );
    const lines = [
      "row_number,student_number,first_name,last_name,validation_status,error_message",
      ...problemRows.map((row) =>
        [
          row.rowNumber,
          csvEscape(row.studentNumber ?? ""),
          csvEscape(row.firstName ?? ""),
          csvEscape(row.lastName ?? ""),
          row.validationStatus,
          csvEscape(row.errorMessage ?? ""),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `import-errors-${activeBatch.id.slice(0, 8)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="student-import-heading" className="mt-12">
      <h2
        id="student-import-heading"
        className="font-display text-2xl tracking-tight text-ink"
      >
        Bulk import
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Upload a CSV (Excel: File → Save As → CSV UTF-8). Dry-run validates
        rows and flags duplicates; commit creates students and optional
        enrolments when year/grade/section names match this school.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink"
        >
          Download CSV template
        </button>
      </div>

      {canManage ? (
        <form action={dryRunAction} className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="school_id" value={schoolId} />
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">CSV file</span>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="mt-1 block w-full text-sm text-ink file:mr-3 file:rounded-md file:border file:border-line file:bg-paper-elevated file:px-3 file:py-1.5"
            />
          </label>
          <div>
            <button
              type="submit"
              disabled={dryRunPending}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
            >
              {dryRunPending ? "Validating…" : "Upload & dry-run"}
            </button>
          </div>
          {dryRunState.error ? (
            <p role="alert" className="sm:col-span-2 text-sm text-red-700">
              {dryRunState.error}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Only school owners and admins can import students.
        </p>
      )}

      {activeBatch ? (
        <div className="mt-8 border-t border-line/70 pt-8">
          <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Dry-run · {activeBatch.filename}
          </h3>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted uppercase">Rows</dt>
              <dd className="mt-1 text-ink">{activeBatch.rowCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted uppercase">Valid</dt>
              <dd className="mt-1 text-ink">{activeBatch.validCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted uppercase">Errors</dt>
              <dd className="mt-1 text-ink">{activeBatch.errorCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted uppercase">Duplicates</dt>
              <dd className="mt-1 text-ink">{activeBatch.duplicateCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted uppercase">Status</dt>
              <dd className="mt-1 text-ink">{activeBatch.status}</dd>
            </div>
            {activeBatch.status === "committed" ? (
              <div>
                <dt className="text-xs text-muted uppercase">Imported</dt>
                <dd className="mt-1 text-ink">{activeBatch.importedCount}</dd>
              </div>
            ) : null}
          </dl>

          {activeRows.some(
            (r) =>
              r.validationStatus === "error" ||
              r.validationStatus === "duplicate",
          ) ? (
            <button
              type="button"
              onClick={downloadErrorReport}
              className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-ink"
            >
              Download error report
            </button>
          ) : null}

          {activeRows.length > 0 ? (
            <ul className="mt-4 max-h-64 overflow-auto divide-y divide-line/70 border-y border-line/70 text-sm">
              {activeRows.slice(0, 50).map((row) => (
                <li key={row.id} className="py-2">
                  <span className="font-medium text-ink">
                    Row {row.rowNumber}
                  </span>
                  <span className="ml-2 text-muted">
                    {row.studentNumber ?? "—"} · {row.firstName ?? ""}{" "}
                    {row.lastName ?? ""}
                  </span>
                  <span className="ml-2 text-muted">{row.validationStatus}</span>
                  {row.errorMessage ? (
                    <p className="mt-0.5 text-red-700">{row.errorMessage}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {activeRows.length > 50 ? (
            <p className="mt-2 text-sm text-muted">
              Showing first 50 rows. Download the error report for full detail.
            </p>
          ) : null}

          {canManage &&
          activeBatch.status === "dry_run" &&
          activeBatch.validCount > 0 ? (
            <form action={commitAction} className="mt-6">
              <input type="hidden" name="school_id" value={schoolId} />
              <input type="hidden" name="batch_id" value={activeBatch.id} />
              <button
                type="submit"
                disabled={commitPending}
                className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper-elevated disabled:opacity-60"
              >
                {commitPending
                  ? "Importing…"
                  : `Commit ${activeBatch.validCount} valid row${activeBatch.validCount === 1 ? "" : "s"}`}
              </button>
              {commitState.error ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {commitState.error}
                </p>
              ) : null}
              {commitState.success ? (
                <p role="status" className="mt-3 text-sm text-teal">
                  {commitState.success}
                </p>
              ) : null}
            </form>
          ) : null}

          {commitState.success && activeBatch.status === "committed" ? (
            <p role="status" className="mt-3 text-sm text-teal">
              {commitState.success}
            </p>
          ) : null}
        </div>
      ) : null}

      {batches.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold tracking-wide text-ink uppercase">
            Recent imports
          </h3>
          <ul className="mt-3 divide-y divide-line/70 border-y border-line/70 text-sm">
            {batches.map((batch) => (
              <li key={batch.id} className="py-2">
                <a
                  href={`/school/students?school=${schoolId}&import=${batch.id}`}
                  className="font-medium text-ink no-underline hover:underline"
                >
                  {batch.filename}
                </a>
                <span className="ml-2 text-muted">
                  {batch.status} · {batch.validCount}/{batch.rowCount} valid
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
