"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { marketingCta, marketingNav } from "@/features/marketing/content";
import { brand } from "@/lib/brand";

function navLinkClass(active: boolean) {
  return [
    "rounded-sm px-1 py-0.5 text-sm transition",
    active ? "font-semibold text-ink" : "text-muted hover:text-ink",
  ].join(" ");
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper-elevated/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
            {brand.institutionalLabel}
          </p>
          <Link
            href="/"
            className="font-display text-2xl tracking-tight text-ink no-underline hover:text-ink-soft"
            onClick={() => setOpen(false)}
          >
            {brand.productName}
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(pathname === item.href)}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={marketingCta.signIn.href}
            className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {marketingCta.signIn.label}
          </Link>
          <Link
            href={marketingCta.register.href}
            className="inline-flex items-center rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-paper-elevated hover:bg-ink-soft"
          >
            {marketingCta.register.label}
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center rounded-md border border-line px-3 py-2 text-sm font-medium text-ink lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <nav
          id={menuId}
          aria-label="Mobile primary"
          className="border-t border-line/70 px-6 py-4 lg:hidden sm:px-10"
        >
          <ul className="flex flex-col gap-3">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={navLinkClass(pathname === item.href)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={marketingCta.signIn.href}
                className="text-sm text-muted"
                onClick={() => setOpen(false)}
              >
                {marketingCta.signIn.label}
              </Link>
            </li>
            <li>
              <Link
                href={marketingCta.register.href}
                className="inline-flex items-center rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-paper-elevated"
                onClick={() => setOpen(false)}
              >
                {marketingCta.register.label}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
