import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { EnterSchoolPanel } from "@/features/schools/invitations/enter-school-panel";
import { peekSchoolInvitation } from "@/features/schools/invitations/peek";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptSchoolInvitePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-md px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Enter your school
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          This activation link is incomplete. Ask the platform team to send you
          a new school admin link.
        </p>
      </main>
    );
  }

  const peeked = await peekSchoolInvitation(token);

  if (!peeked) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-md px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Enter your school
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          This invitation link is invalid.
        </p>
      </main>
    );
  }

  if (peeked.status !== "pending" && peeked.status !== "accepted") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-md px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Enter your school
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          This invitation is {peeked.status}. Ask the platform team to generate
          a new activation link for {peeked.schoolName}.
        </p>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signedInEmail = (user?.email ?? "").toLowerCase();
  if (
    user &&
    signedInEmail &&
    signedInEmail !== peeked.email.toLowerCase()
  ) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-md px-6 py-16 outline-none sm:px-10"
      >
        <h1 className="font-display text-3xl tracking-tight text-ink">
          Enter your school
        </h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          You are signed in as {user.email}, but this invitation is for{" "}
          {peeked.email}. Sign out first, then open the link again.
        </p>
        <form action={signOutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper-elevated"
          >
            Sign out
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          After signing out, reload this activation link.
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <EnterSchoolPanel
        token={token}
        email={peeked.email}
        schoolName={peeked.schoolName}
      />
      {user ? (
        <p className="mx-auto max-w-md px-6 pb-10 text-center text-xs text-muted sm:px-10">
          Signed in as {user.email}.{" "}
          <Link href="/school" className="underline-offset-2 hover:underline">
            Go to school
          </Link>
        </p>
      ) : null}
    </main>
  );
}
