import Link from "next/link";

import { previewAdminUser } from "@/features/schools/ui-preview/sms-fixtures";

type NavItem = {
  href: string;
  label: string;
  match?: (path: string) => boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/ui-preview/school",
        label: "Dashboard",
        match: (p) => p === "/ui-preview/school",
      },
    ],
  },
  {
    label: "Student",
    items: [
      { href: "/ui-preview/school/students", label: "Student list" },
      { href: "/ui-preview/school/students/new", label: "Add new student" },
    ],
  },
  {
    label: "Teachers",
    items: [
      { href: "/ui-preview/school/teachers", label: "Teacher list" },
      {
        href: "/ui-preview/school/teachers/tch-001",
        label: "Teacher details",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/ui-preview/school/guardians", label: "Guardians" },
      { href: "/ui-preview/school/attendance", label: "Attendance" },
      { href: "/ui-preview/school/academic", label: "Classes / academic" },
      { href: "/ui-preview/school/members", label: "Staff & roles" },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/ui-preview/school/settings", label: "Settings" },
      { href: "/ui-preview/school/setup", label: "Setup checklist" },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/ui-preview/school/students") {
    return (
      pathname === item.href ||
      (pathname.startsWith("/ui-preview/school/students/") &&
        !pathname.endsWith("/new"))
    );
  }
  if (item.href.startsWith("/ui-preview/school/teachers/")) {
    return pathname.startsWith("/ui-preview/school/teachers/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * EduDash-inspired admin chrome for UI preview screens (fixture data only).
 */
export function SchoolAdminPreviewShell({
  children,
  pathname,
  title,
  breadcrumbs,
  actions,
}: {
  children: React.ReactNode;
  pathname: string;
  title: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#eef1f4] text-ink">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col bg-[#1a222b] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-teal-bright uppercase">
            ILMOFAHM
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            School console
          </p>
        </div>

        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-sm font-semibold"
          >
            {previewAdminUser.initials}
          </div>
          <div>
            <p className="text-sm font-medium">{previewAdminUser.name}</p>
            <p className="text-xs text-white/60">{previewAdminUser.role}</p>
          </div>
        </div>

        <nav aria-label="School modules" className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-2 text-[0.65rem] font-semibold tracking-[0.14em] text-white/40 uppercase">
                {group.label}
              </p>
              <ul className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "block rounded-md bg-teal px-3 py-2 text-sm font-medium text-white no-underline"
                            : "block rounded-md px-3 py-2 text-sm text-white/75 no-underline hover:bg-white/5 hover:text-white"
                        }
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <p className="border-t border-white/10 px-5 py-3 text-xs text-white/40">
          UI preview · synthetic data
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 sm:px-4 lg:px-5"
        >
          Hardcoded preview for layout review. Forms do not save to a live school.
        </div>

        <div className="border-b border-line bg-paper-elevated px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <p className="text-xs text-muted">{breadcrumbs.join(" / ")}</p>
              ) : null}
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                {title}
              </h1>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          aria-label="School modules mobile"
          className="flex gap-2 overflow-x-auto border-b border-line bg-paper-elevated px-3 py-2 sm:px-4 lg:hidden"
        >
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-paper-elevated no-underline"
                    : "shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-ink no-underline"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
