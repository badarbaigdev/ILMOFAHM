import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";

export const metadata = {
  title: "Guardians · UI preview",
};

const ROWS = [
  {
    name: "Robert Hallam",
    phone: "209-555-0100",
    students: "Seth Hallam",
    relation: "Father",
  },
  {
    name: "Anna Hallam",
    phone: "209-555-0101",
    students: "Seth Hallam",
    relation: "Mother",
  },
  {
    name: "Fatima Ahmed",
    phone: "+92 300 1111111",
    students: "Darlene Robertson",
    relation: "Mother",
  },
] as const;

export default function GuardiansUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school/guardians"
      title="Guardians"
      breadcrumbs={["Dashboard", "Guardians"]}
    >
      <div className="overflow-x-auto rounded-xl border border-line bg-paper-elevated">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Linked student</th>
              <th className="px-4 py-3 font-medium">Relationship</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {ROWS.map((row) => (
              <tr key={row.name + row.phone}>
                <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">{row.students}</td>
                <td className="px-4 py-3">{row.relation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SchoolAdminPreviewShell>
  );
}
