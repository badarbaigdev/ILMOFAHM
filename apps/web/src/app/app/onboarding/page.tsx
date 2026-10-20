import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { OnboardingForm } from "@/features/platform/onboarding/onboarding-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app/onboarding");
  }

  // Fresh key per page load; retries without reload reuse the hidden form value.
  const idempotencyKey = randomUUID();

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <OnboardingForm idempotencyKey={idempotencyKey} />
    </main>
  );
}
