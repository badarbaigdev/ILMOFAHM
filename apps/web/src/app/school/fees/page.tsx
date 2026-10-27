import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { schoolBrandLogoUrl, schoolBrandName } from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolFeesPanel } from "@/features/schools/fees/fees-panel";
import {
  listSchoolFeeCharges,
  listSchoolFeeHeads,
  listSchoolFeePayments,
  summarizeFeeCharges,
} from "@/features/schools/fees/queries";
import { listSchoolStudents } from "@/features/schools/students/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolFeesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/fees?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/fees";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  let loaded;
  try {
    loaded = await loadSchoolContext(
      supabase,
      user.id,
      requestedSchoolId,
      hostSchoolSlug ?? undefined,
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Fees</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load fees.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Fees</h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view fees.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "fee.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold text-ink">Fees</h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view fees for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  let heads;
  let charges;
  let payments;
  let students;
  try {
    [heads, charges, payments, students] = await Promise.all([
      listSchoolFeeHeads(supabase, active.school.id),
      listSchoolFeeCharges(supabase, active.school.id),
      listSchoolFeePayments(supabase, active.school.id),
      listSchoolStudents(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Fees</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load fee records.
        </p>
      </main>
    );
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "fee.manage",
  );
  const summary = summarizeFeeCharges(charges);
  const brandName = schoolBrandName(active.school);
  const logoUrl = schoolBrandLogoUrl(active.school);
  const contact = [active.school.phone, active.school.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="text-sm text-muted">
        <Link
          href={`/school?school=${active.school.id}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          ← {brandName}
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        Fees collection
      </h1>
      <p className="mt-1 text-sm text-muted">
        Fee bills and payment receipts for {brandName}. Platform SaaS billing
        stays separate.
      </p>

      <SchoolFeesPanel
        schoolId={active.school.id}
        schoolName={brandName}
        schoolLogoUrl={logoUrl}
        schoolContact={contact || null}
        heads={heads}
        charges={charges}
        payments={payments}
        students={students}
        summary={summary}
        canManage={canManage}
      />
    </main>
  );
}
