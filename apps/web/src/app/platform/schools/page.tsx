import Link from "next/link";

import { requirePlatformOperatorPage } from "@/features/platform/operator/require-operator";
import { listPlatformSchools } from "@/features/schools/platform-queries";
import {
  institutionTypeLabel,
  isInstitutionType,
} from "@/features/institution/mode";

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
        className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
      >
        <h1 className="font-display text-4xl tracking-tight text-ink">
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
      className="mx-auto w-full max-w-5xl px-6 py-12 outline-none sm:px-10 sm:py-16"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        Schools
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Provisioned school tenants. Each school is created at most once per
        approved application through the controlled provisioning path.
      </p>

      {schools.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          No schools yet.{" "}
          <Link
            href="/platform/requests"
            className="text-ink-soft underline"
          >
            Review applications
          </Link>{" "}
          to provision the first one.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
          {schools.map((school) => (
            <li key={school.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl text-ink">{school.name}</h2>
                <span className="text-xs tracking-wide text-muted uppercase">
                  {school.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {isInstitutionType(school.institutionType)
                  ? institutionTypeLabel(school.institutionType)
                  : school.institutionType}
                {school.slug ? ` · ${school.slug}` : ""}
                {school.city ? ` · ${school.city}` : ""}
                {school.defaultCampusName
                  ? ` · campus ${school.defaultCampusName}`
                  : " · no default campus"}
                {school.ownerInvitationStatus
                  ? ` · invite ${school.ownerInvitationStatus}`
                  : " · no owner invite"}
              </p>
              <p className="mt-1 font-mono text-xs text-muted">{school.id}</p>
              {school.applicationId ? (
                <p className="mt-2 text-sm">
                  <Link
                    href={`/platform/requests/${school.applicationId}`}
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    View source application
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
