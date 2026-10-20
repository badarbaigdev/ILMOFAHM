import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { brand } from "@/lib/brand";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const plannedAreas = [
  { id: "organization", label: "Organization" },
  { id: "students", label: "Students" },
  { id: "attendance", label: "Attendance" },
  { id: "fees", label: "Fees" },
  { id: "examinations", label: "Examinations" },
] as const;

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Public shell foundation for landing/status pages.
 * Auth header links reflect the current cookie session (getUser).
 */
export async function AppShell({ children }: AppShellProps) {
  let user: { id: string } | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
  } catch {
    // Missing env or Auth unreachable (e.g. CI placeholder URL) → treat as signed out.
    user = null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="border-b border-line/80 bg-paper-elevated/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
              {brand.institutionalLabel}
            </p>
            <Link
              href="/"
              className="font-display text-2xl tracking-tight text-ink no-underline hover:text-ink-soft"
            >
              {brand.productName}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <nav aria-label="Planned modules" className="min-w-0">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                {plannedAreas.map((area) => (
                  <li key={area.id}>
                    <span
                      className="inline-flex items-center gap-2 rounded-sm px-1 py-0.5"
                      title="Not implemented yet"
                    >
                      <span>{area.label}</span>
                      <span className="text-xs tracking-wide text-muted/80 uppercase">
                        Soon
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="sr-only">
                Module areas are placeholders and are not available yet.
              </p>
            </nav>

            <nav aria-label="Account" className="text-sm">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/app"
                    className="text-ink-soft underline-offset-2 hover:underline"
                  >
                    Workspace
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="font-medium text-ink underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>
            {brand.productName} engineering foundation — no live institution
            data on this surface.
          </p>
          <p>
            <a
              href="/api/health"
              className="text-ink-soft underline-offset-2 hover:underline"
            >
              Service health
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
