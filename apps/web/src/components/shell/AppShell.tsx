import Link from "next/link";

import { SignedInNav } from "@/components/shell/SignedInNav";
import { signOutAction } from "@/features/auth/actions";
import { isActivePlatformOperator } from "@/features/platform/operator/authorize-platform";
import { brand } from "@/lib/brand";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const publicLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/register-school", label: "Register school" },
] as const;

type AppShellProps = {
  children: React.ReactNode;
};

/**
 * Site shell: brand lockup + account controls.
 * Signed-in users get workspace or platform navigation.
 */
export async function AppShell({ children }: AppShellProps) {
  let user: { id: string } | null = null;
  let isPlatformOperator = false;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
    if (sessionUser) {
      isPlatformOperator = await isActivePlatformOperator(
        supabase,
        sessionUser.id,
      );
    }
  } catch {
    user = null;
    isPlatformOperator = false;
  }

  const homeHref = user ? (isPlatformOperator ? "/platform" : "/school") : "/";

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper-elevated/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
              {brand.institutionalLabel}
            </p>
            <Link
              href={homeHref}
              className="font-display text-2xl tracking-tight text-ink no-underline hover:text-ink-soft"
            >
              {brand.productName}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {user ? (
              <SignedInNav isPlatformOperator={isPlatformOperator} />
            ) : (
              <nav aria-label="Public site" className="min-w-0">
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                  {publicLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="underline-offset-2 hover:text-ink hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <nav aria-label="Account" className="text-sm">
              {user ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    Sign out
                  </button>
                </form>
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
            {brand.productName} — {brand.tagline}
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
