"use client";

import { useActionState, useMemo, useState } from "react";

import {
  DialogField,
  DialogSelect,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolGuardianActionState,
  createSchoolGuardianAction,
  linkSchoolStudentGuardianAction,
  unlinkSchoolStudentGuardianAction,
} from "@/features/schools/guardians/actions";
import type {
  SchoolGuardianRow,
  SchoolStudentGuardianRow,
} from "@/features/schools/guardians/queries";
import type { SchoolStudentRow } from "@/features/schools/students/queries";
import {
  PersonCell,
  RowActionsMenu,
  SchoolDataTable,
  StatusBadge,
} from "@/features/schools/ui/data-table";

const initial: SchoolGuardianActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  guardians: SchoolGuardianRow[];
  links: SchoolStudentGuardianRow[];
  students: SchoolStudentRow[];
  canManage: boolean;
};

export function SchoolGuardiansPanel({
  schoolId,
  guardians,
  links,
  students,
  canManage,
}: Props) {
  const [createState, createAction, createPending] = useActionState(
    createSchoolGuardianAction,
    initial,
  );
  const [linkState, linkAction, linkPending] = useActionState(
    linkSchoolStudentGuardianAction,
    initial,
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkSchoolStudentGuardianAction,
    initial,
  );

  const createDialog = useActionDialog(createState);
  const linkDialog = useActionDialog(linkState);
  const unlinkDialog = useActionDialog(unlinkState);
  const [unlinkTarget, setUnlinkTarget] =
    useState<SchoolStudentGuardianRow | null>(null);

  const studentLabel = new Map(
    students.map((s) => [
      s.id,
      `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
    ]),
  );
  const guardianLabel = new Map(
    guardians.map((g) => [g.id, `${g.firstName} ${g.lastName}`]),
  );

  const activeGuardians = guardians.filter((g) => g.status === "active");
  const activeStudents = students.filter((s) => s.status === "active");
  const activeLinks = links.filter((l) => l.status === "active");

  const guardianRows = useMemo(() => {
    const labels = new Map(
      students.map((s) => [
        s.id,
        `${s.studentNumber} · ${s.firstName} ${s.lastName}`,
      ]),
    );
    return guardians.map((guardian) => {
      const linked = activeLinks.filter((l) => l.guardianId === guardian.id);
      const linkedStudents = linked
        .map((l) => labels.get(l.studentId) ?? "Student")
        .join(", ");
      return {
        ...guardian,
        linkedStudents: linkedStudents || "—",
        linkCount: linked.length,
      };
    });
  }, [guardians, activeLinks, students]);

  return (
    <div>
      <section aria-labelledby="guardians-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <h2 id="guardians-list-heading" className="sr-only">
            Guardians
          </h2>
          {canManage ? (
            <>
              <button
                type="button"
                onClick={linkDialog.openDialog}
                className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink"
              >
                Link guardian
              </button>
              <button
                type="button"
                onClick={createDialog.openDialog}
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
              >
                + Add guardian
              </button>
            </>
          ) : null}
        </div>

        <SchoolDataTable
          rows={guardianRows}
          rowKey={(row) => row.id}
          searchPlaceholder="Search guardians"
          searchText={(row) =>
            [
              row.firstName,
              row.lastName,
              row.email ?? "",
              row.phone ?? "",
              row.linkedStudents,
              row.status,
            ].join(" ")
          }
          filterOptions={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "archived", label: "Archived" },
          ]}
          filterValue={(row) => row.status}
          emptyMessage="No guardians yet."
          exportFileName="guardians"
          columns={[
            {
              id: "name",
              header: "Name",
              cell: (row) => (
                <PersonCell
                  name={`${row.firstName} ${row.lastName}`}
                  secondary={row.email}
                  href={`/school/guardians/${row.id}?school=${schoolId}`}
                  photoUrl={row.photoUrl}
                />
              ),
            },
            {
              id: "phone",
              header: "Phone",
              cell: (row) => row.phone ?? "—",
            },
            {
              id: "students",
              header: "Linked students",
              cell: (row) => row.linkedStudents,
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </section>

      <section aria-labelledby="links-heading" className="mt-12">
        <h2
          id="links-heading"
          className="font-display text-2xl tracking-tight text-ink"
        >
          Student links
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Connect guardians to students with a relationship. One primary contact
          per student.
        </p>

        <div className="mt-6">
          <SchoolDataTable
            rows={activeLinks}
            rowKey={(row) => row.id}
            searchPlaceholder="Search links"
            searchText={(row) =>
              [
                studentLabel.get(row.studentId) ?? "",
                guardianLabel.get(row.guardianId) ?? "",
                row.relationship,
                row.isPrimary ? "primary" : "",
              ].join(" ")
            }
            emptyMessage="No active links yet."
            exportFileName="guardian-links"
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
                id: "guardian",
                header: "Guardian",
                cell: (row) => {
                  const guardian = guardians.find((g) => g.id === row.guardianId);
                  return (
                    <PersonCell
                      name={
                        guardian
                          ? `${guardian.firstName} ${guardian.lastName}`
                          : (guardianLabel.get(row.guardianId) ?? "Guardian")
                      }
                      href={`/school/guardians/${row.guardianId}?school=${schoolId}`}
                      photoUrl={guardian?.photoUrl}
                    />
                  );
                },
              },
              {
                id: "relationship",
                header: "Relationship",
                cell: (row) => (
                  <span className="capitalize">
                    {row.relationship}
                    {row.isPrimary ? " · primary" : ""}
                  </span>
                ),
              },
              {
                id: "action",
                header: "Action",
                cell: (row) => {
                  if (!canManage) return <span className="text-muted">—</span>;
                  return (
                    <RowActionsMenu>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUnlinkTarget(row);
                          unlinkDialog.openDialog();
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                      >
                        Revoke link
                      </button>
                    </RowActionsMenu>
                  );
                },
              },
            ]}
          />
        </div>
      </section>

      {!canManage ? (
        <p className="mt-8 text-sm text-muted">
          You can view guardians. Only owners and admins can manage them.
        </p>
      ) : null}

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="Add guardian"
        description="Create a parent or contact record for this school."
        submitLabel="Create guardian"
        formAction={createAction}
        busy={createPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={createState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="g-first"
            name="first_name"
            label="First name"
            required
          />
          <DialogField id="g-last" name="last_name" label="Last name" required />
        </div>
        <DialogField
          id="g-email"
          name="email"
          label="Email (optional)"
          type="email"
        />
        <DialogField id="g-phone" name="phone" label="Phone (optional)" />
      </FormDialog>

      <FormDialog
        open={linkDialog.open}
        onClose={linkDialog.closeDialog}
        title="Link guardian to student"
        description="Connect a guardian with a relationship. Mark one contact as primary per student."
        submitLabel="Link guardian"
        formAction={linkAction}
        busy={linkPending}
        dirty={linkDialog.dirty}
        onDirtyChange={linkDialog.setDirty}
        error={linkState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogSelect
          id="link-student"
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
          id="link-guardian"
          name="guardian_id"
          label="Guardian"
          required
          disabled={activeGuardians.length === 0}
          options={activeGuardians.map((g) => ({
            value: g.id,
            label: `${g.firstName} ${g.lastName}`,
          }))}
        />
        <DialogSelect
          id="link-relationship"
          name="relationship"
          label="Relationship"
          required
          options={[
            { value: "mother", label: "Mother" },
            { value: "father", label: "Father" },
            { value: "guardian", label: "Guardian" },
            { value: "grandparent", label: "Grandparent" },
            { value: "sibling", label: "Sibling" },
            { value: "other", label: "Other" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="is_primary"
            className="rounded border-line"
          />
          Primary contact for this student
        </label>
        {activeStudents.length === 0 ? (
          <p className="text-xs text-muted">
            Add a student first under Students.
          </p>
        ) : null}
      </FormDialog>

      <FormDialog
        open={unlinkDialog.open && unlinkTarget !== null}
        onClose={() => {
          unlinkDialog.closeDialog();
          setUnlinkTarget(null);
        }}
        title="Revoke guardian link"
        description="Remove this guardian–student relationship? The guardian and student records stay on file."
        submitLabel="Revoke link"
        formAction={unlinkAction}
        busy={unlinkPending}
        error={unlinkState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="link_id" value={unlinkTarget?.id ?? ""} />
        {unlinkTarget ? (
          <p className="text-sm text-muted">
            {guardianLabel.get(unlinkTarget.guardianId) ?? "Guardian"} ·{" "}
            {studentLabel.get(unlinkTarget.studentId) ?? "Student"} ·{" "}
            <span className="capitalize">{unlinkTarget.relationship}</span>
          </p>
        ) : null}
      </FormDialog>
    </div>
  );
}
