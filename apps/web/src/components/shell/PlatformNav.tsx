"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PLATFORM_LINKS = [
  {
    href: "/platform",
    label: "Dashboard",
    match: (path: string) => path === "/platform",
  },
  {
    href: "/platform/organizations",
    label: "Organizations",
    match: (path: string) => path.startsWith("/platform/organizations"),
  },
] as const;

/**
 * Navigation for the platform operator (Superadmin) console.
 */
export function PlatformNav() {
  const pathname = usePathname() ?? "/platform";

  return (
    <nav aria-label="Platform console" className="min-w-0">
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {PLATFORM_LINKS.map((link) => {
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
