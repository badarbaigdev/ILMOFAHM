"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { DialogField, DialogSelect, FormDialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type {
  SchoolAcademicTermRow,
  SchoolAcademicYearRow,
  SchoolGradeRow,
  SchoolSectionRow,
  SchoolSubjectRow,
} from "@/features/schools/academic/queries";
import {
  type SchoolExamActionState,
  addSchoolExamPaperAction,
  createSchoolExaminationAction,
  deleteSchoolExamPaperAction,
  publishSchoolExaminationAction,
  unpublishSchoolExaminationAction,
  upsertSchoolExamMarkAction,
} from "@/features/schools/exams/actions";
import {
  assignRanks,
  buildStudentExamResult,
  type GradingBand,
  type SubjectMarkInput,
} from "@/features/schools/exams/calculate";
import type {
  SchoolExamMarkRow,
  SchoolExamPaperRow,
  SchoolExaminationRow,
  SchoolGradingBandRow,
} from "@/features/schools/exams/queries";
import {
  ExamReportCard,
  type AttendanceSummary,
} from "@/features/schools/exams/report-card";
import { EXAM_TYPES } from "@/features/schools/exams/validate";
import { printElement } from "@/features/schools/print/print-element";
import type { SchoolEnrolmentRow } from "@/features/schools/students/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import { SchoolLogo } from "@/features/schools/ui/school-logo";

const initial: SchoolExamActionState = { error: null, success: null };

type TabId = "exams" | "marks" | "results";

type Props = {
  schoolId: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  years: SchoolAcademicYearRow[];
  terms: SchoolAcademicTermRow[];
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  subjects: SchoolSubjectRow[];
  students: SchoolStudentRow[];
  enrolments: SchoolEnrolmentRow[];
  examinations: SchoolExaminationRow[];
  papers: SchoolExamPaperRow[];
  marks: SchoolExamMarkRow[];
  gradingBands: SchoolGradingBandRow[];
  attendanceByStudent: Record<string, AttendanceSummary>;
  canManageMarks: boolean;
  canAdminister: boolean;
};

function examTypeLabel(value: string): string {
  return EXAM_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function SchoolExamsPanel({
  schoolId,
  schoolName,
  schoolLogoUrl = null,
  schoolEmail = null,
  schoolPhone = null,
  schoolAddress = null,
  years,
  terms,
  grades,
  sections,
  subjects,
  students,
  enrolments,
  examinations,
  papers,
  marks,
  gradingBands,
  attendanceByStudent,
  canManageMarks,
  canAdminister,
}: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabId>("exams");
  const [examId, setExamId] = useState(examinations[0]?.id ?? "");
  const [paperId, setPaperId] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reportStudentId, setReportStudentId] = useState("");

  const [createState, createAction, createPending] = useActionState(
    createSchoolExaminationAction,
    initial,
  );
  const [paperState, paperAction, paperPending] = useActionState(
    addSchoolExamPaperAction,
    initial,
  );
  const [markState, markAction, markPending] = useActionState(
    upsertSchoolExamMarkAction,
    initial,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishSchoolExaminationAction,
    initial,
  );
  const [unpublishState, unpublishAction, unpublishPending] = useActionState(
    unpublishSchoolExaminationAction,
    initial,
  );
  const [deletePaperState, deletePaperAction, deletePaperPending] =
    useActionState(deleteSchoolExamPaperAction, initial);

  const createDialog = useActionDialog(createState);
  const paperDialog = useActionDialog(paperState);
  const markDialog = useActionDialog(markState);

  const gradeName = useMemo(
    () => new Map(grades.map((g) => [g.id, g.name])),
    [grades],
  );
  const sectionName = useMemo(
    () => new Map(sections.map((s) => [s.id, s.name])),
    [sections],
  );
  const subjectName = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.name])),
    [subjects],
  );
  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );
  const yearName = useMemo(
    () => new Map(years.map((y) => [y.id, y.name])),
    [years],
  );

  const exam = examinations.find((e) => e.id === examId) ?? null;
  const examPapers = useMemo(
    () => papers.filter((p) => p.examinationId === examId),
    [papers, examId],
  );

  const activePaper =
    examPapers.find((p) => p.id === paperId) ?? examPapers[0] ?? null;

  const bandsForExam: GradingBand[] = useMemo(() => {
    if (!exam) return [];
    return gradingBands
      .filter((b) => b.scaleId === exam.gradingScaleId)
      .map((b) => ({
        minPercent: b.minPercent,
        maxPercent: b.maxPercent,
        gradeLabel: b.gradeLabel,
        isPass: b.isPass,
        sortOrder: b.sortOrder,
      }));
  }, [gradingBands, exam]);

  const sectionIdsForExam = useMemo(
    () => [...new Set(examPapers.map((p) => p.sectionId))],
    [examPapers],
  );

  const results = useMemo(() => {
    if (!exam) return [];
    const published = exam.status === "published";
    const showUnpublished = canManageMarks;
    if (!published && !showUnpublished) return [];

    const targetSections = sectionFilter
      ? [sectionFilter]
      : sectionIdsForExam;

    const studentIds = new Set(
      enrolments
        .filter(
          (e) =>
            e.status === "enrolled" &&
            e.academicYearId === exam.academicYearId &&
            e.sectionId &&
            targetSections.includes(e.sectionId),
        )
        .map((e) => e.studentId),
    );

    const built = [...studentIds].map((sid) => {
      const subjectInputs: SubjectMarkInput[] = examPapers
        .filter((p) => {
          const enr = enrolments.find(
            (e) =>
              e.studentId === sid &&
              e.academicYearId === exam.academicYearId &&
              e.status === "enrolled",
          );
          return enr?.sectionId === p.sectionId;
        })
        .map((p) => {
          const mark = marks.find(
            (m) => m.paperId === p.id && m.studentId === sid,
          );
          return {
            subjectId: p.subjectId,
            subjectName: subjectName.get(p.subjectId) ?? "Subject",
            maxMarks: p.maxMarks,
            passMarks: p.passMarks,
            marksObtained: mark?.marksObtained ?? null,
            attendanceStatus: (mark?.attendanceStatus as
              | "present"
              | "absent"
              | "exempt"
              | undefined) ?? "missing",
            remarks: mark?.remarks ?? null,
          };
        });

      return buildStudentExamResult({
        studentId: sid,
        subjects: subjectInputs,
        bands: bandsForExam,
        examPublished: published,
      });
    });

    let ranked = assignRanks(built, exam.publishRanks && published);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      ranked = ranked.filter((r) => {
        const st = studentById.get(r.studentId);
        if (!st) return false;
        return (
          `${st.firstName} ${st.lastName}`.toLowerCase().includes(q) ||
          st.studentNumber.toLowerCase().includes(q)
        );
      });
    }
    if (studentFilter) {
      ranked = ranked.filter((r) => r.studentId === studentFilter);
    }
    return ranked;
  }, [
    exam,
    canManageMarks,
    sectionFilter,
    sectionIdsForExam,
    enrolments,
    examPapers,
    marks,
    subjectName,
    bandsForExam,
    exam?.publishRanks,
    search,
    studentById,
    studentFilter,
  ]);

  const paperStudents = useMemo(() => {
    if (!activePaper || !exam) return [];
    return enrolments
      .filter(
        (e) =>
          e.status === "enrolled" &&
          e.academicYearId === exam.academicYearId &&
          e.sectionId === activePaper.sectionId,
      )
      .map((e) => studentById.get(e.studentId))
      .filter((s): s is SchoolStudentRow => Boolean(s))
      .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));
  }, [activePaper, exam, enrolments, studentById]);

  const [editingStudent, setEditingStudent] = useState<SchoolStudentRow | null>(
    null,
  );

  const reportStudent =
    studentById.get(reportStudentId) ??
    studentById.get(results[0]?.studentId ?? "") ??
    null;
  const reportResult =
    results.find((r) => r.studentId === reportStudent?.id) ?? null;

  function printReport() {
    if (!reportRef.current || !reportStudent) return;
    printElement(
      reportRef.current,
      `Report card · ${reportStudent.firstName} ${reportStudent.lastName} · ${schoolName}`,
    );
  }

  function printClassSheet() {
    if (!sheetRef.current) return;
    printElement(
      sheetRef.current,
      `Class result sheet · ${exam?.name ?? "Exam"} · ${schoolName}`,
    );
  }

  const locked = exam?.status === "published";

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
              Examinations
            </h1>
            <p className="mt-1 text-sm text-muted">
              Set up exams, enter marks, publish results, and print report cards.
            </p>
          </div>
        </div>
        {canAdminister ? (
          <button
            type="button"
            onClick={createDialog.openDialog}
            className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white"
          >
            New examination
          </button>
        ) : null}
      </header>

      <div
        role="tablist"
        aria-label="Examination views"
        className="mt-6 flex flex-wrap gap-1 rounded-md border border-line bg-paper-elevated p-0.5"
      >
        {(
          [
            ["exams", "Exams"],
            ["marks", "Marks entry"],
            ["results", "Results & report cards"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              tab === id ? "bg-teal text-white" : "text-ink hover:bg-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-muted">Examination</span>
          <select
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              setPaperId("");
              setSectionFilter("");
            }}
            className="mt-1 block min-w-[16rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
          >
            <option value="">Select examination</option>
            {examinations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.status})
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === "exams" ? (
        <section className="mt-6 space-y-4">
          {!exam ? (
            <p className="text-sm text-muted">
              Create an examination to get started.
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-line bg-paper-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">
                      {exam.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {examTypeLabel(exam.examType)} ·{" "}
                      {yearName.get(exam.academicYearId) ?? "Session"} · status{" "}
                      <span className="font-medium text-ink">{exam.status}</span>
                    </p>
                  </div>
                  <div className="school-print-screen-only flex flex-wrap gap-2">
                    {canAdminister && exam.status !== "published" ? (
                      <form action={publishAction}>
                        <input type="hidden" name="school_id" value={schoolId} />
                        <input
                          type="hidden"
                          name="examination_id"
                          value={exam.id}
                        />
                        <button
                          type="submit"
                          disabled={publishPending}
                          className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                        >
                          {publishPending ? "Publishing…" : "Publish results"}
                        </button>
                      </form>
                    ) : null}
                    {canAdminister && exam.status === "published" ? (
                      <form action={unpublishAction}>
                        <input type="hidden" name="school_id" value={schoolId} />
                        <input
                          type="hidden"
                          name="examination_id"
                          value={exam.id}
                        />
                        <button
                          type="submit"
                          disabled={unpublishPending}
                          className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink disabled:opacity-60"
                        >
                          {unpublishPending ? "Reopening…" : "Unpublish"}
                        </button>
                      </form>
                    ) : null}
                    {canAdminister && !locked ? (
                      <button
                        type="button"
                        onClick={paperDialog.openDialog}
                        className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink"
                      >
                        Add subject
                      </button>
                    ) : null}
                  </div>
                </div>
                {(publishState.error || unpublishState.error) && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {publishState.error || unpublishState.error}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-3 py-3 font-medium">Class</th>
                      <th className="px-3 py-3 font-medium">Section</th>
                      <th className="px-3 py-3 font-medium">Subject</th>
                      <th className="px-3 py-3 font-medium">Max</th>
                      <th className="px-3 py-3 font-medium">Pass</th>
                      <th className="px-3 py-3 font-medium school-print-screen-only">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {examPapers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-muted"
                        >
                          No subjects configured yet.
                        </td>
                      </tr>
                    ) : (
                      examPapers.map((paper) => (
                        <tr key={paper.id} className="border-b border-line/70">
                          <td className="px-3 py-2">
                            {gradeName.get(paper.gradeId) ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {sectionName.get(paper.sectionId) ?? "—"}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {subjectName.get(paper.subjectId) ?? "—"}
                          </td>
                          <td className="px-3 py-2">{paper.maxMarks}</td>
                          <td className="px-3 py-2">{paper.passMarks}</td>
                          <td className="px-3 py-2 school-print-screen-only">
                            {canAdminister && !locked ? (
                              <form action={deletePaperAction}>
                                <input
                                  type="hidden"
                                  name="school_id"
                                  value={schoolId}
                                />
                                <input
                                  type="hidden"
                                  name="paper_id"
                                  value={paper.id}
                                />
                                <button
                                  type="submit"
                                  disabled={deletePaperPending}
                                  className="text-xs text-muted hover:underline"
                                >
                                  Remove
                                </button>
                              </form>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === "marks" ? (
        <section className="mt-6 space-y-4">
          {!exam || examPapers.length === 0 ? (
            <p className="text-sm text-muted">
              Configure subjects on the Exams tab before entering marks.
            </p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="text-muted">Subject paper</span>
                <select
                  value={activePaper?.id ?? ""}
                  onChange={(e) => setPaperId(e.target.value)}
                  className="mt-1 block min-w-[18rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                >
                  {examPapers.map((paper) => (
                    <option key={paper.id} value={paper.id}>
                      {gradeName.get(paper.gradeId)} ·{" "}
                      {sectionName.get(paper.sectionId)} ·{" "}
                      {subjectName.get(paper.subjectId)} (max {paper.maxMarks})
                    </option>
                  ))}
                </select>
              </label>
              {locked ? (
                <p className="text-sm text-amber-800">
                  Results are published and locked. Unpublish to edit marks.
                </p>
              ) : null}
              {markState.error ? (
                <p role="alert" className="text-sm text-red-700">
                  {markState.error}
                </p>
              ) : null}
              <div className="overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-3 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 font-medium">ID</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Marks</th>
                      <th className="px-3 py-3 font-medium school-print-screen-only">
                        Edit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paperStudents.map((student) => {
                      const mark = marks.find(
                        (m) =>
                          m.paperId === activePaper?.id &&
                          m.studentId === student.id,
                      );
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-line/70"
                        >
                          <td className="px-3 py-2 font-medium">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {student.studentNumber}
                          </td>
                          <td className="px-3 py-2">
                            {mark?.attendanceStatus ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {mark?.marksObtained ?? "—"}
                          </td>
                          <td className="px-3 py-2 school-print-screen-only">
                            {canManageMarks && !locked && activePaper ? (
                              <button
                                type="button"
                                className="text-xs font-medium text-teal hover:underline"
                                onClick={() => {
                                  setEditingStudent(student);
                                  markDialog.openDialog();
                                }}
                              >
                                Enter
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : null}

      {tab === "results" ? (
        <section className="mt-6 space-y-4">
          {!exam ? (
            <p className="text-sm text-muted">Select an examination.</p>
          ) : exam.status !== "published" && !canManageMarks ? (
            <p className="text-sm text-muted">
              Results will appear here after publication.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm">
                  <span className="text-muted">Section</span>
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="mt-1 block min-w-[10rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                  >
                    <option value="">All sections</option>
                    {sectionIdsForExam.map((id) => (
                      <option key={id} value={id}>
                        {gradeName.get(
                          sections.find((s) => s.id === id)?.gradeId ?? "",
                        )}{" "}
                        · {sectionName.get(id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-muted">Search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or ID"
                    className="mt-1 block min-w-[12rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted">Report card student</span>
                  <select
                    value={reportStudent?.id ?? ""}
                    onChange={(e) => setReportStudentId(e.target.value)}
                    className="mt-1 block min-w-[14rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
                  >
                    <option value="">Select student</option>
                    {results.map((r) => {
                      const st = studentById.get(r.studentId);
                      if (!st) return null;
                      return (
                        <option key={r.studentId} value={r.studentId}>
                          {st.firstName} {st.lastName} ({st.studentNumber})
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={printReport}
                  disabled={!reportStudent || !reportResult}
                  className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
                >
                  Print / PDF report card
                </button>
                <button
                  type="button"
                  onClick={printClassSheet}
                  disabled={results.length === 0}
                  className="rounded-md border border-line bg-paper-elevated px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
                >
                  Print class sheet
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-3 py-3 font-medium">#</th>
                      <th className="px-3 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 font-medium">Obtained</th>
                      <th className="px-3 py-3 font-medium">Max</th>
                      <th className="px-3 py-3 font-medium">%</th>
                      <th className="px-3 py-3 font-medium">Grade</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-8 text-center text-muted"
                        >
                          No results to show.
                        </td>
                      </tr>
                    ) : (
                      results.map((r, idx) => {
                        const st = studentById.get(r.studentId);
                        return (
                          <tr
                            key={r.studentId}
                            className="border-b border-line/70"
                          >
                            <td className="px-3 py-2 text-muted">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">
                              {st
                                ? `${st.firstName} ${st.lastName}`
                                : r.studentId}
                            </td>
                            <td className="px-3 py-2">{r.totalObtained}</td>
                            <td className="px-3 py-2">{r.totalMax}</td>
                            <td className="px-3 py-2">
                              {r.percent != null ? `${r.percent}%` : "—"}
                            </td>
                            <td className="px-3 py-2">{r.gradeLabel ?? "—"}</td>
                            <td className="px-3 py-2 capitalize">
                              {r.overallStatus}
                            </td>
                            <td className="px-3 py-2">{r.rank ?? "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Print targets (visually available for report preview) */}
              {reportStudent && reportResult && exam ? (
                <div ref={reportRef} className="mt-6 rounded-2xl border border-line">
                  <ExamReportCard
                    schoolName={schoolName}
                    schoolLogoUrl={schoolLogoUrl}
                    schoolEmail={schoolEmail}
                    schoolPhone={schoolPhone}
                    schoolAddress={schoolAddress}
                    examName={exam.name}
                    examTypeLabel={examTypeLabel(exam.examType)}
                    yearName={yearName.get(exam.academicYearId) ?? "Session"}
                    classLabel={
                      gradeName.get(
                        enrolments.find(
                          (e) =>
                            e.studentId === reportStudent.id &&
                            e.academicYearId === exam.academicYearId,
                        )?.gradeId ?? "",
                      ) ?? "—"
                    }
                    sectionLabel={
                      sectionName.get(
                        enrolments.find(
                          (e) =>
                            e.studentId === reportStudent.id &&
                            e.academicYearId === exam.academicYearId,
                        )?.sectionId ?? "",
                      ) ?? "—"
                    }
                    student={reportStudent}
                    result={reportResult}
                    attendance={attendanceByStudent[reportStudent.id] ?? null}
                  />
                </div>
              ) : null}

              <div className="sr-only">
                <div ref={sheetRef} className="school-print-face p-6">
                  <h2 className="text-lg font-semibold">
                    {schoolName} — {exam.name} result sheet
                  </h2>
                  <table className="mt-4 w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">Student</th>
                        <th className="py-1 pr-2">ID</th>
                        <th className="py-1 pr-2">Obtained</th>
                        <th className="py-1 pr-2">Max</th>
                        <th className="py-1 pr-2">%</th>
                        <th className="py-1 pr-2">Grade</th>
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, idx) => {
                        const st = studentById.get(r.studentId);
                        return (
                          <tr key={r.studentId} className="border-b">
                            <td className="py-1 pr-2">{idx + 1}</td>
                            <td className="py-1 pr-2">
                              {st
                                ? `${st.firstName} ${st.lastName}`
                                : r.studentId}
                            </td>
                            <td className="py-1 pr-2">
                              {st?.studentNumber ?? ""}
                            </td>
                            <td className="py-1 pr-2">{r.totalObtained}</td>
                            <td className="py-1 pr-2">{r.totalMax}</td>
                            <td className="py-1 pr-2">
                              {r.percent ?? "—"}
                            </td>
                            <td className="py-1 pr-2">
                              {r.gradeLabel ?? "—"}
                            </td>
                            <td className="py-1 pr-2">{r.overallStatus}</td>
                            <td className="py-1">{r.rank ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="New examination"
        description="Create a monthly, midterm, final, or annual exam for an academic session."
        submitLabel="Create examination"
        formAction={createAction}
        busy={createPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={createState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="publish_ranks" value="true" />
        <DialogField
          id="exam-name"
          name="name"
          label="Examination name"
          required
          placeholder="Midterm — Spring"
        />
        <DialogSelect
          id="exam-type"
          name="exam_type"
          label="Type"
          required
          options={EXAM_TYPES.map((t) => ({
            value: t.value,
            label: t.label,
          }))}
        />
        <DialogSelect
          id="exam-year"
          name="academic_year_id"
          label="Academic session"
          required
          options={years.map((y) => ({
            value: y.id,
            label: y.name + (y.isCurrent ? " (current)" : ""),
          }))}
        />
        <DialogSelect
          id="exam-term"
          name="academic_term_id"
          label="Term (optional)"
          options={[
            { value: "", label: "No term" },
            ...terms.map((t) => ({
              value: t.id,
              label: `${t.name}`,
            })),
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogField id="exam-start" name="starts_on" label="Starts" type="date" />
          <DialogField id="exam-end" name="ends_on" label="Ends" type="date" />
        </div>
      </FormDialog>

      <FormDialog
        open={paperDialog.open && exam !== null}
        onClose={paperDialog.closeDialog}
        title="Add subject paper"
        description="Associate a subject with a class section and mark limits."
        submitLabel="Add subject"
        formAction={paperAction}
        busy={paperPending}
        dirty={paperDialog.dirty}
        onDirtyChange={paperDialog.setDirty}
        error={paperState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="examination_id" value={exam?.id ?? ""} />
        <DialogSelect
          id="paper-grade"
          name="grade_id"
          label="Class"
          required
          options={grades
            .filter((g) => g.status === "active")
            .map((g) => ({ value: g.id, label: g.name }))}
        />
        <DialogSelect
          id="paper-section"
          name="section_id"
          label="Section"
          required
          options={sections
            .filter((s) => s.status === "active")
            .map((s) => ({
              value: s.id,
              label: `${gradeName.get(s.gradeId) ?? "Class"} · ${s.name}`,
            }))}
        />
        <DialogSelect
          id="paper-subject"
          name="subject_id"
          label="Subject"
          required
          options={subjects
            .filter((s) => s.status === "active")
            .map((s) => ({ value: s.id, label: s.name }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="paper-max"
            name="max_marks"
            label="Maximum marks"
            required
            defaultValue="100"
          />
          <DialogField
            id="paper-pass"
            name="pass_marks"
            label="Passing marks"
            required
            defaultValue="40"
          />
        </div>
      </FormDialog>

      <FormDialog
        open={markDialog.open && editingStudent !== null && activePaper !== null}
        onClose={() => {
          markDialog.closeDialog();
          setEditingStudent(null);
        }}
        title="Enter marks"
        description={
          editingStudent
            ? `${editingStudent.firstName} ${editingStudent.lastName} · max ${activePaper?.maxMarks ?? ""}`
            : undefined
        }
        submitLabel="Save marks"
        formAction={markAction}
        busy={markPending}
        dirty={markDialog.dirty}
        onDirtyChange={markDialog.setDirty}
        error={markState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="paper_id" value={activePaper?.id ?? ""} />
        <input
          type="hidden"
          name="student_id"
          value={editingStudent?.id ?? ""}
        />
        <input
          type="hidden"
          name="max_marks"
          value={String(activePaper?.maxMarks ?? 0)}
        />
        <DialogSelect
          id="mark-status"
          name="attendance_status"
          label="Status"
          required
          defaultValue={
            marks.find(
              (m) =>
                m.paperId === activePaper?.id &&
                m.studentId === editingStudent?.id,
            )?.attendanceStatus ?? "present"
          }
          options={[
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
            { value: "exempt", label: "Exempt" },
          ]}
        />
        <DialogField
          id="mark-obtained"
          name="marks_obtained"
          label="Marks obtained"
          defaultValue={
            marks
              .find(
                (m) =>
                  m.paperId === activePaper?.id &&
                  m.studentId === editingStudent?.id,
              )
              ?.marksObtained?.toString() ?? ""
          }
        />
        <DialogField
          id="mark-remarks"
          name="remarks"
          label="Remarks (optional)"
          defaultValue={
            marks.find(
              (m) =>
                m.paperId === activePaper?.id &&
                m.studentId === editingStudent?.id,
            )?.remarks ?? ""
          }
        />
      </FormDialog>
    </div>
  );
}
