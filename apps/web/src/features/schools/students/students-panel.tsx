"use client";

import { useActionState, useMemo, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type {
  SchoolAcademicYearRow,
  SchoolGradeRow,
  SchoolSectionRow,
} from "@/features/schools/academic/queries";
import {
  type SchoolStudentActionState,
  createSchoolEnrolmentAction,
  createSchoolStudentAction,
  withdrawSchoolEnrolmentAction,
} from "@/features/schools/students/actions";
import type {
  SchoolEnrolmentRow,
  SchoolStudentRow,
} from "@/features/schools/students/queries";
import {
  PersonCell,
  RowActionsMenu,
  SchoolDataTable,
  StatusBadge,
  formatListDate,
} from "@/features/schools/ui/data-table";

const initial: SchoolStudentActionState = { error: null, success: null };

export type StudentsPanelSection = "directory" | "enrolments";

type Props = {
  schoolId: string;
  students: SchoolStudentRow[];
  enrolments: SchoolEnrolmentRow[];
  years: SchoolAcademicYearRow[];
  grades: SchoolGradeRow[];
  sections: SchoolSectionRow[];
  canManage: boolean;
  activeSection: StudentsPanelSection;
};

type StudentListRow = SchoolStudentRow & {
  classLabel: string;
  rollHint: string | null;
};

export function SchoolStudentsPanel({
  schoolId,
  students,
  enrolments,
  years,
  grades,
  sections,
  canManage,
  activeSection,
}: Props) {
  const [studentState, studentAction, studentPending] = useActionState(
    createSchoolStudentAction,
    initial,
  );
  const [enrolState, enrolAction, enrolPending] = useActionState(
    createSchoolEnrolmentAction,
    initial,
  );
  const [withdrawState, withdrawAction, withdrawPending] = useActionState(
    withdrawSchoolEnrolmentAction,
    initial,
  );

  const createDialog = useActionDialog(studentState);
  const enrolDialog = useActionDialog(enrolState);
  const withdrawDialog = useActionDialog(withdrawState);
  const [withdrawTarget, setWithdrawTarget] = useState<SchoolEnrolmentRow | null>(
    null,
  );

  const yearName = new Map(years.map((y) => [y.id, y.name]));
  const gradeName = new Map(grades.map((g) => [g.id, g.name]));
  const sectionName = new Map(sections.map((s) => [s.id, s.name]));
  const studentLabel = new Map(
    students.map((s) => [
      s.id,
      `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
    ]),
  );

  const activeStudents = students.filter((s) => s.status === "active");
  const activeGrades = grades.filter((g) => g.status === "active");
  const activeSections = sections.filter((s) => s.status === "active");

  const listRows = useMemo((): StudentListRow[] => {
    const gradesById = new Map(grades.map((g) => [g.id, g.name]));
    const sectionsById = new Map(sections.map((s) => [s.id, s.name]));
    return students.map((student) => {
      const enrolment =
        enrolments.find(
          (e) => e.studentId === student.id && e.status === "enrolled",
        ) ?? enrolments.find((e) => e.studentId === student.id);
      const grade = enrolment ? gradesById.get(enrolment.gradeId) : null;
      const section = enrolment?.sectionId
        ? sectionsById.get(enrolment.sectionId)
        : null;
      const classLabel = grade
        ? section
          ? `${grade} (${section})`
          : grade
        : "—";
      return {
        ...student,
        classLabel,
        rollHint: enrolment ? `Enrolled ${enrolment.enrolledOn}` : null,
      };
    });
  }, [students, enrolments, grades, sections]);

  function openWithdraw(enrolment: SchoolEnrolmentRow) {
    setWithdrawTarget(enrolment);
    withdrawDialog.openDialog();
  }

  const withdrawStudentName = withdrawTarget
    ? (studentLabel.get(withdrawTarget.studentId) ?? "this student")
    : "this student";

  return (
    <div>
      {activeSection === "directory" ? (
        <section aria-labelledby="students-list-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="students-list-heading"
                className="text-sm font-semibold tracking-wide text-ink uppercase"
              >
                Directory
              </h2>
              <p className="mt-1 text-sm text-muted">
                Search and manage student records.
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={enrolDialog.openDialog}
                  className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
                >
                  Enrol student
                </button>
                <button
                  type="button"
                  onClick={createDialog.openDialog}
                  className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
                >
                  + Add student
                </button>
              </div>
            ) : null}
          </div>

          <SchoolDataTable
            rows={listRows}
            rowKey={(row) => row.id}
            searchPlaceholder="Search students"
            searchText={(row) =>
              [
                row.studentNumber,
                row.firstName,
                row.lastName,
                row.classLabel,
                row.gender ?? "",
                row.status,
              ].join(" ")
            }
            filterOptions={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "archived", label: "Archived" },
            ]}
            filterValue={(row) => row.status}
            emptyMessage="No students yet."
            exportFileName="students"
            columns={[
              {
                id: "admission",
                header: "Admission no",
                cell: (row) => (
                  <span className="font-medium text-teal">
                    {row.studentNumber}
                  </span>
                ),
              },
              {
                id: "name",
                header: "Name",
                cell: (row) => (
                  <PersonCell
                    name={`${row.firstName} ${row.lastName}`}
                    secondary={row.rollHint}
                    href={`/school/students/${row.id}?school=${schoolId}`}
                    photoUrl={row.photoUrl}
                  />
                ),
              },
              {
                id: "class",
                header: "Class",
                cell: (row) => row.classLabel,
              },
              {
                id: "dob",
                header: "Date of birth",
                cell: (row) => formatListDate(row.dateOfBirth),
              },
              {
                id: "gender",
                header: "Gender",
                cell: (row) => (
                  <span className="capitalize">{row.gender ?? "—"}</span>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: (row) => <StatusBadge status={row.status} />,
              },
              {
                id: "action",
                header: "Action",
                cell: (row) => {
                  const enrolment = enrolments.find(
                    (e) => e.studentId === row.id && e.status === "enrolled",
                  );
                  if (!canManage || !enrolment) {
                    return <span className="text-muted">—</span>;
                  }
                  return (
                    <RowActionsMenu>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openWithdraw(enrolment)}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      >
                        Withdraw enrolment
                      </button>
                    </RowActionsMenu>
                  );
                },
              },
            ]}
          />
        </section>
      ) : null}

      {activeSection === "enrolments" ? (
        <section aria-labelledby="enrolments-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="enrolments-heading"
                className="text-sm font-semibold tracking-wide text-ink uppercase"
              >
                Enrolments
              </h2>
              <p className="mt-1 text-sm text-muted">
                Place students in a grade and optional section for an academic
                year.
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={enrolDialog.openDialog}
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
              >
                Enrol student
              </button>
            ) : null}
          </div>

          <SchoolDataTable
            rows={enrolments}
            rowKey={(row) => row.id}
            searchPlaceholder="Search enrolments"
            searchText={(row) =>
              [
                studentLabel.get(row.studentId) ?? "",
                yearName.get(row.academicYearId) ?? "",
                gradeName.get(row.gradeId) ?? "",
                row.sectionId ? (sectionName.get(row.sectionId) ?? "") : "",
                row.status,
              ].join(" ")
            }
            filterOptions={[
              { value: "enrolled", label: "Enrolled" },
              { value: "withdrawn", label: "Withdrawn" },
              { value: "transferred", label: "Transferred" },
            ]}
            filterValue={(row) => row.status}
            emptyMessage="No enrolments yet."
            exportFileName="enrolments"
            selectable={false}
            columns={[
              {
                id: "student",
                header: "Student",
                cell: (row) => {
                  const label = studentLabel.get(row.studentId) ?? "Student";
                  const [number, ...rest] = label.split(" · ");
                  const student = students.find((s) => s.id === row.studentId);
                  return (
                    <PersonCell
                      name={rest.join(" · ") || label}
                      secondary={number !== label ? number : null}
                      href={`/school/students/${row.studentId}?school=${schoolId}`}
                      photoUrl={student?.photoUrl}
                    />
                  );
                },
              },
              {
                id: "year",
                header: "Year",
                cell: (row) => yearName.get(row.academicYearId) ?? "—",
              },
              {
                id: "class",
                header: "Class",
                cell: (row) => {
                  const grade = gradeName.get(row.gradeId) ?? "Grade";
                  const section = row.sectionId
                    ? sectionName.get(row.sectionId)
                    : null;
                  return section ? `${grade} (${section})` : grade;
                },
              },
              {
                id: "enrolled",
                header: "Enrolled on",
                cell: (row) => formatListDate(row.enrolledOn),
              },
              {
                id: "status",
                header: "Status",
                cell: (row) => <StatusBadge status={row.status} />,
              },
              {
                id: "action",
                header: "Action",
                cell: (row) => {
                  if (!canManage || row.status !== "enrolled") {
                    return <span className="text-muted">—</span>;
                  }
                  return (
                    <RowActionsMenu>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openWithdraw(row)}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      >
                        Withdraw
                      </button>
                    </RowActionsMenu>
                  );
                },
              },
            ]}
          />
        </section>
      ) : null}

      {!canManage ? (
        <p className="mt-8 text-sm text-muted">
          You can view students. Only owners and admins can add or enrol them.
        </p>
      ) : null}

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="Add student"
        description="Create a student record. Enrol them in a class afterwards."
        submitLabel="Create student"
        formAction={studentAction}
        busy={studentPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={studentState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="student-number"
          name="student_number"
          label="Student number"
          required
          placeholder="STU-001"
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="student-first"
            name="first_name"
            label="First name"
            required
          />
          <DialogField
            id="student-last"
            name="last_name"
            label="Last name"
            required
          />
        </div>
        <DialogField
          id="student-dob"
          name="date_of_birth"
          label="Date of birth (optional)"
          type="date"
        />
        <DialogSelect
          id="student-gender"
          name="gender"
          label="Gender (optional)"
          allowEmpty
          emptyLabel="Not specified"
          options={[
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
            { value: "other", label: "Other" },
            { value: "unspecified", label: "Unspecified" },
          ]}
        />
      </FormDialog>

      <FormDialog
        open={enrolDialog.open}
        onClose={enrolDialog.closeDialog}
        title="Enrol student"
        description="Assign a student to a grade and optional section for an academic year."
        submitLabel="Enrol student"
        formAction={enrolAction}
        busy={enrolPending}
        dirty={enrolDialog.dirty}
        onDirtyChange={enrolDialog.setDirty}
        error={enrolState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogSelect
          id="enrol-student"
          name="student_id"
          label="Student"
          required
          disabled={activeStudents.length === 0}
          options={activeStudents.map((s) => ({
            value: s.id,
            label: `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
          }))}
        />
        <DialogSelect
          id="enrol-year"
          name="academic_year_id"
          label="Academic year"
          required
          disabled={years.length === 0}
          options={years.map((y) => ({
            value: y.id,
            label: `${y.name}${y.isCurrent ? " (current)" : ""}`,
          }))}
        />
        <DialogSelect
          id="enrol-grade"
          name="grade_id"
          label="Grade"
          required
          disabled={activeGrades.length === 0}
          options={activeGrades.map((g) => ({
            value: g.id,
            label: g.name,
          }))}
        />
        <DialogSelect
          id="enrol-section"
          name="section_id"
          label="Section (optional)"
          allowEmpty
          disabled={activeSections.length === 0}
          options={activeSections.map((s) => ({
            value: s.id,
            label: `${gradeName.get(s.gradeId) ?? "Grade"} · ${s.name}`,
          }))}
        />
        <DialogField
          id="enrol-date"
          name="enrolled_on"
          label="Enrolled on"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        {years.length === 0 || activeGrades.length === 0 ? (
          <p className="text-xs text-muted">
            Create an academic year and grade under Classes before enrolling.
          </p>
        ) : null}
      </FormDialog>

      <FormDialog
        open={withdrawDialog.open && withdrawTarget !== null}
        onClose={() => {
          withdrawDialog.closeDialog();
          setWithdrawTarget(null);
        }}
        title="Withdraw enrolment"
        description={`Withdraw ${withdrawStudentName} from their current class placement?`}
        submitLabel="Withdraw enrolment"
        formAction={withdrawAction}
        busy={withdrawPending}
        error={withdrawState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="enrolment_id"
          value={withdrawTarget?.id ?? ""}
        />
        <p className="text-sm text-muted">
          The student record stays on file. Only this year’s enrolment status
          changes to withdrawn.
        </p>
      </FormDialog>
    </div>
  );
}
