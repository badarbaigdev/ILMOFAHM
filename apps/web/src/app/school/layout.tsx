import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { SCHOOL_CONSOLE_NAV } from "@/components/shell/console-nav";
import { signOutAction } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userLabel = "School user";
  let userRole = "Member";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      userLabel =
        (profile?.full_name as string | undefined)?.trim() ||
        user.email ||
        "School user";

      const { data: membership } = await supabase
        .from("school_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (membership?.role) {
        userRole = String(membership.role);
      }
    }
  } catch {
    // Layout still renders; page-level auth will redirect.
  }

  return (
    <ConsoleShell
      variant="school"
      navGroups={SCHOOL_CONSOLE_NAV}
      userLabel={userLabel}
      userRole={userRole}
      signOutAction={signOutAction}
    >
      {children}
    </ConsoleShell>
  );
}
