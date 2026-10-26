import Link from "next/link";

import { SignUpForm } from "@/features/auth/auth-form";
import { safeAuthNextPath } from "@/features/auth/paths";
import { peekSchoolInvitation } from "@/features/schools/invitations/peek";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string; email?: string }>;
};

function inviteTokenFromNext(nextPath: string | null): string | null {
  if (!nextPath) return null;
  try {
    const url = new URL(nextPath, "http://local.invalid");
    if (!url.pathname.startsWith("/auth/accept-school-invite")) return null;
    const token = url.searchParams.get("token")?.trim() ?? "";
    return token.length >= 32 ? token : null;
  } catch {
    return null;
  }
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);
  const emailParam = params.email?.trim().toLowerCase() || null;

  let invitedEmail = emailParam;
  const token = inviteTokenFromNext(nextPath);
  if (!invitedEmail && token) {
    const peeked = await peekSchoolInvitation(token);
    if (peeked?.status === "pending") {
      invitedEmail = peeked.email;
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="outline-none">
      <SignUpForm nextPath={nextPath} invitedEmail={invitedEmail} />
      <p className="mx-auto max-w-md px-6 pb-16 text-sm text-muted sm:px-10">
        Already registered?{" "}
        <Link
          href={
            nextPath && nextPath !== "/school"
              ? `/auth/sign-in?next=${encodeURIComponent(nextPath)}`
              : "/auth/sign-in"
          }
          className="text-ink-soft underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
