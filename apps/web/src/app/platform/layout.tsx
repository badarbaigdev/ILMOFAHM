import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PLATFORM_CONSOLE_NAV } from "@/components/shell/console-nav";
import { signOutAction } from "@/features/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userLabel = "Platform operator";
  let userRole = "Operator";

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
        "Platform operator";
      userRole = "Superadmin";
    }
  } catch {
    // Page-level operator guard handles unauthorized access.
  }

  return (
    <ConsoleShell
      variant="platform"
      navGroups={PLATFORM_CONSOLE_NAV}
      userLabel={userLabel}
      userRole={userRole}
      signOutAction={signOutAction}
    >
      {children}
    </ConsoleShell>
  );
}
