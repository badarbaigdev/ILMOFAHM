import Link from "next/link";

import { UI_PREVIEW_LINKS } from "@/features/schools/ui-preview/fixtures";

/**
 * Shared chrome for school UI preview pages (synthetic data, no live tenant).
 */
export function SchoolUiPreviewChrome({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-950 sm:px-10"
      >
        <p className="mx-auto max-w-3xl">
          <span className="font-semibold">UI preview</span> — synthetic fixture
          data only. Forms are visible for layout review; saves are not live
          school actions.
        </p>
      </div>
      <header className="border-b border-line/80 bg-paper-elevated">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-4 sm:px-10">
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
            School portal · preview
          </p>
          <nav aria-label="UI preview pages">
            <ul className="flex flex-wrap gap-x-1 gap-y-1 text-sm">
              {UI_PREVIEW_LINKS.map((link) => {
                const active = link.href === activeHref;
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
        </div>
      </header>
      {children}
    </div>
  );
}
