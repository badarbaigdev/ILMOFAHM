"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ToastHost } from "@/components/ui/toast";
import { SchoolLogo } from "@/features/schools/ui/school-logo";
import { brand } from "@/lib/brand";

export type ConsoleNavItem = {
  href: string;
  label: string;
  /** When true, only the exact pathname matches (dashboard roots). */
  exact?: boolean;
};

export type ConsoleNavGroup = {
  label: string;
  items: ConsoleNavItem[];
};

type Props = {
  variant: "school" | "platform";
  navGroups: ConsoleNavGroup[];
  userLabel: string;
  userRole: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  brandLabel?: string;
  brandLogoUrl?: string | null;
  accountHref?: string;
};

export function isConsoleNavActive(
  pathname: string,
  item: ConsoleNavItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Shared EduDash-style console chrome for school and platform portals.
 */
export function ConsoleShell({
  variant,
  navGroups,
  userLabel,
  userRole,
  signOutAction,
  children,
  brandLabel,
  brandLogoUrl,
  accountHref,
}: Props) {
  const pathname = usePathname() ?? (variant === "platform" ? "/platform" : "/school");
  const homeHref = variant === "platform" ? "/platform" : "/school";
  const flatItems = navGroups.flatMap((g) => g.items);
  const schoolBrand =
    variant === "school" ? brandLabel?.trim() || "School console" : null;
  const initials =
    userLabel
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="flex min-h-screen bg-[#eef1f4] text-ink">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col bg-[#1a222b] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-teal-bright uppercase">
            {brand.productName}
          </p>
          <Link
            href={homeHref}
            className="mt-2 flex items-center gap-2.5 no-underline"
          >
            {variant === "school" ? (
              <SchoolLogo
                schoolName={schoolBrand ?? "School"}
                logoUrl={brandLogoUrl}
                size="sm"
              />
            ) : null}
            <span className="min-w-0 text-lg font-semibold tracking-tight text-white">
              {variant === "platform" ? "Platform console" : schoolBrand}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal text-sm font-semibold"
          >
            {initials}
          </div>
          <div className="min-w-0">
            {variant === "school" && accountHref ? (
              <Link
                href={accountHref}
                className="block truncate text-sm font-medium text-white no-underline hover:underline"
              >
                {userLabel}
              </Link>
            ) : (
              <p className="truncate text-sm font-medium">{userLabel}</p>
            )}
            <p className="text-xs text-white/60">{userRole}</p>
          </div>
        </div>

        <nav aria-label={variant === "platform" ? "Platform" : "School"} className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-2 text-[0.65rem] font-semibold tracking-[0.14em] text-white/40 uppercase">
                {group.label}
              </p>
              <ul className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const active = isConsoleNavActive(pathname, item);
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

        <div className="border-t border-white/10 px-5 py-3">
          {variant === "school" && accountHref ? (
            <Link
              href={accountHref}
              className="mb-2 block text-xs text-white/60 no-underline underline-offset-2 hover:text-white hover:underline"
            >
              Account
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {variant === "platform" ? (
          <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper-elevated px-3 py-3 sm:px-4 lg:px-5">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="console-search">
                Search
              </label>
              <input
                id="console-search"
                type="search"
                placeholder="Search schools, requests…"
                className="w-full max-w-md rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
            <Link
              href="/"
              className="text-sm text-muted no-underline hover:text-ink"
            >
              Public site
            </Link>
            <form action={signOutAction} className="lg:hidden">
              <button
                type="submit"
                className="text-sm text-ink underline-offset-2 hover:underline"
              >
                Sign out
              </button>
            </form>
          </header>
        ) : (
          <header className="flex items-center justify-end border-b border-line bg-paper-elevated px-3 py-3 sm:px-4 lg:px-5">
            <AccountMenu
              userLabel={userLabel}
              accountHref={accountHref}
              signOutAction={signOutAction}
            />
          </header>
        )}

        <nav
          aria-label="Mobile modules"
          className="flex gap-2 overflow-x-auto border-b border-line bg-paper-elevated px-3 py-2 sm:px-4 lg:hidden"
        >
          {flatItems.map((item) => {
            const active = isConsoleNavActive(pathname, item);
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

        <div className="flex-1">{children}</div>
        <ToastHost />
      </div>
    </div>
  );
}

function AccountMenu({
  userLabel,
  accountHref,
  signOutAction,
}: {
  userLabel: string;
  accountHref?: string;
  signOutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink"
      >
        <span className="max-w-[10rem] truncate">{userLabel}</span>
        <span aria-hidden className="text-muted">
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[11rem] rounded-md border border-line bg-paper-elevated py-1 shadow-md"
        >
          {accountHref ? (
            <Link
              href={accountHref}
              role="menuitem"
              className="block px-3 py-2 text-sm text-ink no-underline hover:bg-paper"
              onClick={() => setOpen(false)}
            >
              View profile
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
