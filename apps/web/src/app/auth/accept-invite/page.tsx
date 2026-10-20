import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteForm } from "@/features/platform/memberships/accept-invite-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AcceptInvitePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = token
      ? `/auth/accept-invite?token=${encodeURIComponent(token)}`
      : "/auth/accept-invite";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (!token) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-md px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Accept invitation
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          This invitation link is missing a token. Ask your administrator for a
          new invite.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/app" className="text-ink-soft underline">
            Go to workspace
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <AcceptInviteForm token={token} email={user.email ?? null} />
    </main>
  );
}
