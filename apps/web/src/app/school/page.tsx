import Link from "next/link";
import { redirect } from "next/navigation";

import {
  DonutChart,
  StatCard,
  buildSlices,
} from "@/features/platform/ui/dashboard-charts";
import { listSchoolAcademicYears } from "@/features/schools/academic/queries";
import { listSchoolAttendanceSessions } from "@/features/schools/attendance/queries";
import { loadSchoolContext } from "@/features/schools/context";
import { listSchoolFeeCharges } from "@/features/schools/fees/queries";
import { summarizeFeeCharges } from "@/features/schools/fees/summary";
import { listSchoolTeachers } from "@/features/schools/teachers/queries";
import {
  listSchoolEnrolments,
  listSchoolStudents,
} from "@/features/schools/students/queries";
import { StatusBadge } from "@/features/schools/ui/data-table";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

/**
 * School portal home. Managers with pending setup are sent to /school/setup.
 */
export default async function SchoolPortalPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school";
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
        className="mx-auto w-full max-w-2xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          School portal
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load your school memberships.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          School portal
        </h1>
        <p className="mt-4 text-sm text-muted">
          You are signed in, but this account is not a school admin yet. Accept a
          school invitation after platform approval to get access.
        </p>
        <p className="mt-6 text-sm">
          <Link
            href="/auth/accept-school-invite"
            className="text-ink underline-offset-2 hover:underline"
          >
            Have a school invite?
          </Link>
        </p>
      </main>
    );
  }

  const { active, memberships } = loaded;

  if (active.needsSetup && active.canManage) {
    redirect(`/school/setup?school=${active.school.id}`);
  }

  const schoolId = active.school.id;
  const q = `school=${schoolId}`;

  let studentCount = 0;
  let teacherCount = 0;
  let enrolmentCount = 0;
  let yearCount = 0;
  let feeSummary = { collected: "0", due: "0", overdue: "0" };
  let attendanceOpen = 0;
  let studentStatus: Record<string, number> = {};

  try {
    const [students, teachers, enrolments, years, charges, sessions] =
      await Promise.all([
        listSchoolStudents(supabase, schoolId),
        listSchoolTeachers(supabase, schoolId),
        listSchoolEnrolments(supabase, schoolId),
        listSchoolAcademicYears(supabase, schoolId),
        listSchoolFeeCharges(supabase, schoolId).catch(() => []),
        listSchoolAttendanceSessions(supabase, schoolId).catch(() => []),
      ]);
    studentCount = students.length;
    teacherCount = teachers.filter((t) => t.status === "active").length;
    enrolmentCount = enrolments.filter((e) => e.status === "enrolled").length;
    yearCount = years.length;
    feeSummary = summarizeFeeCharges(charges);
    attendanceOpen = sessions.filter((s) => s.status === "draft").length;
    studentStatus = students.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});
  } catch {
    // Dashboard still renders with zeros when a module query fails.
  }

  const formatMoney = (amount: string) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    return `₨ ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  };

  const shortcuts = [
    { href: `/school/students?${q}`, label: "Students", hint: `${studentCount}` },
    { href: `/school/teachers?${q}`, label: "Teachers", hint: `${teacherCount}` },
    { href: `/school/attendance?${q}`, label: "Attendance", hint: attendanceOpen ? `${attendanceOpen} draft` : "Open" },
    { href: `/school/fees?${q}`, label: "Fees", hint: formatMoney(feeSummary.due) },
    { href: `/school/academic?${q}`, label: "Classes", hint: `${yearCount} year${yearCount === 1 ? "" : "s"}` },
    { href: `/school/guardians?${q}`, label: "Guardians", hint: "Contacts" },
    { href: `/school/members?${q}`, label: "Staff", hint: "Roles" },
    { href: `/school/settings?${q}`, label: "Settings", hint: "School" },
  ];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl px-4 py-8 outline-none sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {active.school.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <StatusBadge status={active.school.status} />
            <span className="mx-2 text-line">·</span>
            {active.membership.role}
          </p>
        </div>
        <Link
          href={`/school/students?${q}`}
          className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white no-underline"
        >
          Open students
        </Link>
      </div>

      <section
        aria-label="Key metrics"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Students"
          value={studentCount}
          hint={`${enrolmentCount} enrolled`}
          href={`/school/students?${q}`}
          tone="info"
        />
        <StatCard
          label="Teachers"
          value={teacherCount}
          hint="Active staff"
          href={`/school/teachers?${q}`}
        />
        <StatCard
          label="Fees due"
          value={formatMoney(feeSummary.due)}
          hint={`Collected ${formatMoney(feeSummary.collected)}`}
          href={`/school/fees?${q}`}
          tone={Number(feeSummary.due) > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="Draft attendance"
          value={attendanceOpen}
          hint="Sessions to submit"
          href={`/school/attendance?${q}`}
          tone={attendanceOpen > 0 ? "warn" : "default"}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <DonutChart
          title="Student status"
          slices={buildSlices(
            Object.entries(studentStatus).map(([status, value]) => ({
              id: status,
              label: status,
              value,
            })),
          )}
          centerLabel="Students"
          emptyLabel="Add students to see the mix."
        />

        <section className="rounded-2xl border border-line bg-paper-elevated p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Quick links</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl border border-line bg-paper px-3 py-3 no-underline transition hover:border-teal/40"
              >
                <p className="text-sm font-medium text-ink">{card.label}</p>
                <p className="mt-1 text-xs text-muted">{card.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>

      {memberships.length > 1 ? (
        <section className="mt-4 rounded-2xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">Your schools</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {memberships.map((m) => (
              <li key={m.schoolId}>
                <Link
                  href={`/school?school=${m.schoolId}`}
                  className={
                    m.schoolId === schoolId
                      ? "inline-flex rounded-lg bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal no-underline"
                      : "inline-flex rounded-lg border border-line px-3 py-1.5 text-sm text-ink no-underline hover:bg-paper"
                  }
                >
                  {m.school.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
