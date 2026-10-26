import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/features/auth/auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/forgot-password");
  }

  const needsPassword = Boolean(user.user_metadata?.must_set_password);

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      {needsPassword ? (
        <p
          role="status"
          className="mx-auto max-w-md px-6 pt-10 text-sm text-teal sm:px-10"
        >
          Choose a password for future sign-ins. Your school portal is already
          available after this step.
        </p>
      ) : null}
      <UpdatePasswordForm />
    </main>
  );
}
