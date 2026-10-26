import Link from "next/link";

import { UI_PREVIEW_LINKS } from "@/features/schools/ui-preview/fixtures";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";

export const metadata = {
  title: "UI preview",
};

/**
 * Index of hardcoded UI/UX previews (no auth, synthetic data).
 * Disabled in production.
 */
export default function UiPreviewIndexPage() {
  assertUiPreviewAllowed();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-2xl px-6 py-16 outline-none sm:px-10"
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
        Design review
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink">
        UI preview
      </h1>
      <p className="mt-3 text-muted">
        Hardcoded school-management screens inspired by the EduDash-style
        admin layout. No sign-in required. Data is synthetic fixtures only.
      </p>
      <p className="mt-4 text-sm">
        <Link
          href="/ui-preview/school"
          className="font-medium text-teal no-underline hover:underline"
        >
          Open dashboard →
        </Link>
      </p>
      <ul className="mt-10 divide-y divide-line/70 border-y border-line/70">
        {UI_PREVIEW_LINKS.map((link) => (
          <li key={link.href} className="py-3">
            <Link
              href={link.href}
              className="font-medium text-ink no-underline hover:underline"
            >
              {link.label}
            </Link>
            <p className="mt-0.5 text-sm text-muted">{link.href}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-ink underline-offset-2 hover:underline">
          ← Marketing home
        </Link>
      </p>
    </main>
  );
}
