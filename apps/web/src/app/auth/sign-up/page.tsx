import Link from "next/link";

import { SignUpForm } from "@/features/auth/auth-form";

export default function SignUpPage() {
  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <SignUpForm />
      <p className="mx-auto max-w-md px-6 pb-16 text-sm text-muted sm:px-10">
        Already registered?{" "}
        <Link href="/auth/sign-in" className="text-ink-soft underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
