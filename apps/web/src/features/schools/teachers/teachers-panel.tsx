"use client";

import { useActionState, useState } from "react";

import {
  DialogField,
  FormDialog,
} from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolTeacherActionState,
  archiveSchoolTeacherAction,
  createSchoolTeacherAction,
} from "@/features/schools/teachers/actions";
import type { SchoolTeacherRow } from "@/features/schools/teachers/queries";
import {
  PersonCell,
  RowActionsMenu,
  SchoolDataTable,
  StatusBadge,
} from "@/features/schools/ui/data-table";

const initial: SchoolTeacherActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  teachers: SchoolTeacherRow[];
  canManage: boolean;
};

export function SchoolTeachersPanel({
  schoolId,
  teachers,
  canManage,
}: Props) {
  const [createState, createAction, createPending] = useActionState(
    createSchoolTeacherAction,
    initial,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveSchoolTeacherAction,
    initial,
  );
  const createDialog = useActionDialog(createState);
  const archiveDialog = useActionDialog(archiveState);
  const [archiveTarget, setArchiveTarget] = useState<SchoolTeacherRow | null>(
    null,
  );

  function openArchive(teacher: SchoolTeacherRow) {
    setArchiveTarget(teacher);
    archiveDialog.openDialog();
  }

  return (
    <div>
      <section aria-labelledby="teachers-list-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="teachers-list-heading" className="sr-only">
            Teacher directory
          </h2>
          {canManage ? (
            <button
              type="button"
              onClick={createDialog.openDialog}
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
            >
              + Add teacher
            </button>
          ) : null}
        </div>

        <SchoolDataTable
          rows={teachers}
          rowKey={(row) => row.id}
          searchPlaceholder="Search teachers"
          searchText={(row) =>
            [
              row.staffNumber,
              row.firstName,
              row.lastName,
              row.email ?? "",
              row.phone ?? "",
              row.primarySubject ?? "",
              row.status,
            ].join(" ")
          }
          filterOptions={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "archived", label: "Archived" },
          ]}
          filterValue={(row) => row.status}
          emptyMessage="No teachers yet."
          exportFileName="teachers"
          columns={[
            {
              id: "staff",
              header: "Staff ID",
              cell: (row) => (
                <span className="font-medium text-teal">{row.staffNumber}</span>
              ),
            },
              {
                id: "name",
                header: "Name",
                cell: (row) => (
                  <PersonCell
                    name={`${row.firstName} ${row.lastName}`}
                    secondary={row.email}
                    href={`/school/teachers/${row.id}?school=${schoolId}`}
                    photoUrl={row.photoUrl}
                  />
                ),
              },
            {
              id: "subject",
              header: "Subject",
              cell: (row) => row.primarySubject ?? "—",
            },
            {
              id: "phone",
              header: "Phone",
              cell: (row) => row.phone ?? "—",
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
                if (!canManage || row.status === "archived") {
                  return <span className="text-muted">—</span>;
                }
                return (
                  <RowActionsMenu>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openArchive(row)}
                      className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                    >
                      Archive
                    </button>
                  </RowActionsMenu>
                );
              },
            },
          ]}
        />
      </section>

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="Add teacher"
        description="Create a teaching staff record for this school. Login access is still managed under Staff & roles."
        submitLabel="Create teacher"
        formAction={createAction}
        busy={createPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={createState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField
          id="t-staff"
          name="staff_number"
          label="Staff number"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="t-first"
            name="first_name"
            label="First name"
            required
          />
          <DialogField id="t-last" name="last_name" label="Last name" required />
        </div>
        <DialogField
          id="t-email"
          name="email"
          label="Email (optional)"
          type="email"
        />
        <DialogField id="t-phone" name="phone" label="Phone (optional)" />
        <DialogField
          id="t-subject"
          name="primary_subject"
          label="Primary subject (optional)"
        />
      </FormDialog>

      <FormDialog
        open={archiveDialog.open && archiveTarget !== null}
        onClose={() => {
          archiveDialog.closeDialog();
          setArchiveTarget(null);
        }}
        title="Archive teacher"
        description={
          archiveTarget
            ? `Archive ${archiveTarget.firstName} ${archiveTarget.lastName} (${archiveTarget.staffNumber})? They will no longer appear as active staff.`
            : undefined
        }
        submitLabel="Archive teacher"
        formAction={archiveAction}
        busy={archivePending}
        error={archiveState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input
          type="hidden"
          name="teacher_id"
          value={archiveTarget?.id ?? ""}
        />
        <p className="text-sm text-muted">
          This does not delete historical records. You can keep using archived
          staff IDs for reporting.
        </p>
      </FormDialog>
    </div>
  );
}
