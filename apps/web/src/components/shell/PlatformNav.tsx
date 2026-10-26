"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isConsoleNavActive } from "@/components/shell/ConsoleShell";
import { PLATFORM_CONSOLE_NAV } from "@/components/shell/console-nav";

/**
 * Compact platform nav (legacy AppShell). Prefer ConsoleShell sidebar in /platform.
 */
export function PlatformNav() {
  const pathname = usePathname() ?? "/platform";
  const items = PLATFORM_CONSOLE_NAV.flatMap((g) => g.items);

  return (
    <nav aria-label="Platform console" className="min-w-0">
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {items.map((link) => {
          const active = isConsoleNavActive(pathname, link);
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
