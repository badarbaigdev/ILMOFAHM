import Link from "next/link";

import { marketingCta, marketingNav } from "@/features/marketing/content";
import { brand } from "@/lib/brand";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line/80 bg-ink text-paper-elevated">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal-bright uppercase">
            {brand.institutionalLabel}
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight">
            {brand.productName}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper-elevated/75">
            {brand.tagline} {brand.descriptor}
          </p>
          <Link
            href={marketingCta.register.href}
            className="mt-5 inline-flex text-sm font-semibold text-teal-bright underline-offset-2 hover:underline"
          >
            {marketingCta.register.label}
          </Link>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-paper-elevated/60 uppercase">
            Explore
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-paper-elevated/85 underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={marketingCta.register.href}
                className="text-paper-elevated/85 underline-offset-2 hover:underline"
              >
                School registration
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-paper-elevated/60 uppercase">
            Legal
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-paper-elevated/85 underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-paper-elevated/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-paper-elevated/55 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>
            © {new Date().getFullYear()} {brand.productName}. Illustrative
            marketing content — not live customer statistics.
          </p>
          <p>
            <a
              href="/api/health"
              className="underline-offset-2 hover:text-paper-elevated hover:underline"
            >
              Service health
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
