import Link from "next/link";

import { SignInForm } from "@/features/auth/auth-form";
import { safeAuthNextPath } from "@/features/auth/paths";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);
  const error = params.error;

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      {error ? (
        <p
          role="alert"
          className="mx-auto max-w-md px-6 pt-10 text-sm text-red-700 sm:px-10"
        >
          Authentication could not be completed. Please sign in again.
        </p>
      ) : null}
      <SignInForm nextPath={nextPath} />
      <p className="mx-auto max-w-md px-6 pb-16 text-sm text-muted sm:px-10">
        <Link href="/auth/forgot-password" className="text-ink-soft underline">
          Forgot password?
        </Link>
        {" · "}
        <Link href="/auth/sign-up" className="text-ink-soft underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
