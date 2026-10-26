import Link from "next/link";

import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import { previewStudents } from "@/features/schools/ui-preview/sms-fixtures";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
} from "@/features/schools/ui/data-table";

export const metadata = {
  title: "Student list · UI preview",
};

export default function StudentListUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/students"
      title="Student list"
      breadcrumbs={["Dashboard", "Student", "Student list"]}
      actions={
        <Link
          href="/ui-preview/school/students/new"
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white no-underline"
        >
          + Add student
        </Link>
      }
    >
      <SchoolDataTable
        rows={previewStudents}
        rowKey={(row) => row.id}
        searchPlaceholder="Search students"
        searchText={(row) =>
          [
            row.admissionNo,
            row.firstName,
            row.lastName,
            row.classLabel,
            row.section,
            row.gender,
            row.phone,
            row.category,
            row.status,
          ].join(" ")
        }
        filterOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        filterValue={(row) => row.status}
        emptyMessage="No students in preview."
        exportFileName="preview-students"
        columns={[
          {
            id: "admission",
            header: "Admission no",
            cell: (row) => (
              <span className="font-medium text-teal">{row.admissionNo}</span>
            ),
          },
          {
            id: "name",
            header: "Name",
            cell: (row) => (
              <PersonCell
                name={`${row.firstName} ${row.lastName}`}
                secondary={`Roll no: ${row.rollNo}`}
              />
            ),
          },
          {
            id: "class",
            header: "Class",
            cell: (row) => `${row.classLabel} (${row.section})`,
          },
          {
            id: "dob",
            header: "Date of birth",
            cell: (row) => row.dateOfBirth,
          },
          {
            id: "gender",
            header: "Gender",
            cell: (row) => row.gender,
          },
          {
            id: "mobile",
            header: "Mobile number",
            cell: (row) => row.phone,
          },
          {
            id: "category",
            header: "Category",
            cell: (row) => row.category,
          },
          {
            id: "status",
            header: "Status",
            cell: (row) => <StatusBadge status={row.status} />,
          },
          {
            id: "action",
            header: "Action",
            cell: (row) => (
              <Link
                href={`/ui-preview/school/students/${row.id}`}
                className="text-teal no-underline hover:underline"
              >
                View
              </Link>
            ),
          },
        ]}
      />
    </SchoolAdminPreviewShell>
  );
}
