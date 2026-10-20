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

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <UpdatePasswordForm />
    </main>
  );
}
