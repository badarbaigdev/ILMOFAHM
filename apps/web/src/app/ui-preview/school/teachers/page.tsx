import Link from "next/link";

import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import { previewTeachers } from "@/features/schools/ui-preview/sms-fixtures";
import {
  PersonCell,
  SchoolDataTable,
  StatusBadge,
} from "@/features/schools/ui/data-table";

export const metadata = {
  title: "Teacher list · UI preview",
};

export default function TeacherListUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/teachers"
      title="Teacher list"
      breadcrumbs={["Dashboard", "Teachers", "Teacher list"]}
    >
      <SchoolDataTable
        rows={previewTeachers}
        rowKey={(row) => row.id}
        searchPlaceholder="Search teachers"
        searchText={(row) =>
          [
            row.staffId,
            row.firstName,
            row.lastName,
            row.subject,
            row.classes,
            row.phone,
            row.status,
          ].join(" ")
        }
        filterOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        filterValue={(row) => row.status}
        emptyMessage="No teachers in preview."
        exportFileName="preview-teachers"
        columns={[
          {
            id: "staff",
            header: "Staff ID",
            cell: (row) => (
              <span className="font-medium text-teal">{row.staffId}</span>
            ),
          },
          {
            id: "name",
            header: "Name",
            cell: (row) => (
              <PersonCell name={`${row.firstName} ${row.lastName}`} />
            ),
          },
          {
            id: "subject",
            header: "Subject",
            cell: (row) => row.subject,
          },
          {
            id: "classes",
            header: "Classes",
            cell: (row) => row.classes,
          },
          {
            id: "phone",
            header: "Phone",
            cell: (row) => row.phone,
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
                href={`/ui-preview/school/teachers/${row.id}`}
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
