import { redirect } from "next/navigation";

import { SchoolAccountPanel } from "@/features/schools/account/account-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SchoolAccountPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent("/school/account")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    (profile?.full_name as string | undefined)?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    "";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Account</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Manage your display name and password for the school console.
      </p>
      <div className="mt-8">
        <SchoolAccountPanel email={user.email ?? ""} fullName={fullName} />
      </div>
    </main>
  );
}
