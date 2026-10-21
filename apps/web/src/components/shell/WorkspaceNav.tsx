"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const WORKSPACE_LINKS = [
  { href: "/app", label: "Home", match: (path: string) => path === "/app" },
  {
    href: "/app/setup",
    label: "Academic setup",
    match: (path: string) => path.startsWith("/app/setup"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    match: (path: string) => path.startsWith("/app/settings"),
  },
  {
    href: "/app/members",
    label: "Members",
    match: (path: string) => path.startsWith("/app/members"),
  },
  {
    href: "/app/audit",
    label: "Audit",
    match: (path: string) => path.startsWith("/app/audit"),
  },
] as const;

/**
 * Primary navigation for signed-in institutional workspaces.
 * Active state is path-based; organization query params are preserved by pages.
 */
export function WorkspaceNav() {
  const pathname = usePathname() ?? "/app";

  return (
    <nav aria-label="Workspace" className="min-w-0">
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {WORKSPACE_LINKS.map((link) => {
          const active = link.match(pathname);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-ink px-2.5 py-1.5 font-medium text-paper-elevated no-underline"
                    : "rounded-md px-2.5 py-1.5 text-ink-soft no-underline hover:bg-line/60 hover:text-ink"
                }
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
