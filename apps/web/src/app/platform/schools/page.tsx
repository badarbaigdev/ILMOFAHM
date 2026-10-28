import Link from "next/link";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { PlatformSchoolsTable } from "@/features/platform/ui/platform-lists";
import { listPlatformSchools } from "@/features/schools/platform-queries";

export default async function PlatformSchoolsPage() {
  const { supabase } = await requirePlatformOperatorPage(
    "platform.schools.read",
  );

  let schools;
  try {
    schools = await listPlatformSchools(supabase);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Schools
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load schools.
        </p>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Schools
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Provisioned tenants. Open a school to manage admins, reset profiles,
            or start a time-limited support login to review the school console.
          </p>
        </div>
        <Link
          href="/platform/requests"
          className="rounded-md border border-line bg-paper-elevated px-4 py-2 text-sm font-medium text-ink no-underline"
        >
          Review requests
        </Link>
      </div>

      <div className="mt-8">
        <PlatformSchoolsTable schools={schools} />
      </div>
    </main>
  );
}
