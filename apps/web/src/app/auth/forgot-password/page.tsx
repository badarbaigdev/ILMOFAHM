import Link from "next/link";

import { SchoolAdminPasswordRecoveryForm } from "@/features/auth/school-password-recovery-form";

export default function ForgotPasswordPage() {
  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <SchoolAdminPasswordRecoveryForm />
      <p className="mx-auto max-w-md px-6 pb-16 text-sm text-muted sm:px-10">
        <Link href="/auth/sign-in" className="text-ink-soft underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
