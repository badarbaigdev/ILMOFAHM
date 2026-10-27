import Link from "next/link";
import { redirect } from "next/navigation";

import {
  authorizeSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import {
  schoolBrandLogoUrl,
  schoolBrandName,
} from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import {
  getSchoolGuardian,
  listSchoolStudentGuardians,
} from "@/features/schools/guardians/queries";
import { SchoolIdCard } from "@/features/schools/id-cards/id-card";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ school?: string }>;
};

function schoolContactLine(school: {
  email: string | null;
  phone: string | null;
  city: string | null;
}): string | null {
  const parts = [school.phone, school.email, school.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function SchoolGuardianIdCardPage({
  params,
  searchParams,
}: PageProps) {
  const { id: guardianId } = await params;
  const query = await searchParams;
  const requestedSchoolId = query.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/guardians/${guardianId}/id-card?school=${encodeURIComponent(requestedSchoolId)}`
      : `/school/guardians/${guardianId}/id-card`;
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
    return <IdCardError message="Could not load guardian ID card." />;
  }

  if (!loaded.active) {
    return (
      <IdCardError
        message="You need an active school membership to print ID cards."
        muted
      />
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(supabase, user.id, active.school.id, "student.read");
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <IdCardError message="You do not have permission to view this ID card." />
      );
    }
    throw error;
  }

  let guardian;
  let links;
  try {
    [guardian, links] = await Promise.all([
      getSchoolGuardian(supabase, active.school.id, guardianId),
      listSchoolStudentGuardians(supabase, active.school.id),
    ]);
  } catch {
    return <IdCardError message="Could not load guardian ID card." />;
  }

  if (!guardian) {
    return <IdCardError message="Guardian not found." muted />;
  }

  const primaryLink =
    links.find(
      (l) =>
        l.guardianId === guardian.id &&
        l.status === "active" &&
        l.isPrimary,
    ) ??
    links.find((l) => l.guardianId === guardian.id && l.status === "active");
  const relationship = primaryLink?.relationship ?? "Guardian";
  const brandName = schoolBrandName(active.school);
  const logoUrl = schoolBrandLogoUrl(active.school);
  const schoolQuery = `school=${encodeURIComponent(active.school.id)}`;
  const idValue = guardian.phone?.trim() || guardian.email?.trim() || guardian.id.slice(0, 8).toUpperCase();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <p className="print:hidden text-sm text-muted">
        <Link
          href={`/school/guardians/${guardian.id}?${schoolQuery}`}
          className="text-ink underline-offset-2 hover:underline"
        >
          ← {guardian.firstName} {guardian.lastName}
        </Link>
      </p>
      <h1 className="print:hidden mt-3 text-2xl font-semibold tracking-tight text-ink">
        Guardian ID card
      </h1>
      <div className="mt-6">
        <SchoolIdCard
          schoolName={brandName}
          schoolLogoUrl={logoUrl}
          schoolContact={schoolContactLine(active.school)}
          personName={`${guardian.firstName} ${guardian.lastName}`}
          personPhotoUrl={guardian.photoUrl}
          roleLabel="Guardian"
          idLabel="Contact"
          idValue={idValue}
          detailLabel="Relationship"
          detailValue={relationship}
        />
      </div>
    </main>
  );
}

function IdCardError({
  message,
  muted = false,
}: {
  message: string;
  muted?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-ink">ID card</h1>
      <p
        role={muted ? undefined : "alert"}
        className={`mt-4 text-sm ${muted ? "text-muted" : "text-red-700"}`}
      >
        {message}
      </p>
    </main>
  );
}
