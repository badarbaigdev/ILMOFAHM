import Link from "next/link";
import type { ReactNode } from "react";

export type SubTabItem = {
  id: string;
  label: string;
  href: string;
  count?: number | string;
  icon?: ReactNode;
};

type SubTabsProps = {
  items: readonly SubTabItem[];
  activeId: string;
  label?: string;
  /** Visual style: underline (GitHub-like) or pill (settings-like). */
  variant?: "underline" | "pill";
  trailing?: ReactNode;
};

function formatCount(count: number | string): string {
  if (typeof count === "string") return count;
  if (count >= 1000) {
    const compact = count / 1000;
    return `${compact % 1 === 0 ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }
  return String(count);
}

/**
 * Horizontal sub-navigation for page sections / filters.
 * Matches the GitHub underline + settings pill patterns while staying on-brand.
 */
export function SubTabs({
  items,
  activeId,
  label = "Sections",
  variant = "underline",
  trailing,
}: SubTabsProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={
        variant === "underline"
          ? "mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-line"
          : "mt-6 flex flex-wrap items-center justify-between gap-3"
      }
    >
      <nav aria-label={label} className="min-w-0 flex-1">
        <ul
          className={
            variant === "underline"
              ? "flex flex-wrap gap-1"
              : "flex flex-wrap gap-1 rounded-xl border border-line bg-paper-elevated p-1"
          }
        >
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={tabClassName(variant, active)}
                >
                  {item.icon ? (
                    <span className="shrink-0 opacity-80" aria-hidden>
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                  {item.count != null ? (
                    <span
                      className={
                        active && variant === "pill"
                          ? "rounded-full bg-teal/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-teal"
                          : "rounded-full bg-stone-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted"
                      }
                    >
                      {formatCount(item.count)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {trailing ? <div className="shrink-0 pb-2">{trailing}</div> : null}
    </div>
  );
}

function tabClassName(
  variant: "underline" | "pill",
  active: boolean,
): string {
  if (variant === "pill") {
    return active
      ? "inline-flex items-center gap-1.5 rounded-lg bg-teal/10 px-3 py-2 text-sm font-medium text-teal no-underline"
      : "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted no-underline hover:bg-paper hover:text-ink";
  }

  return active
    ? "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-ink no-underline after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:rounded-full after:bg-teal"
    : "inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm text-muted no-underline hover:bg-paper hover:text-ink";
}
