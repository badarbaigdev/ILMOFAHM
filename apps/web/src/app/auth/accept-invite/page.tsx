import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

/**
 * Legacy organization invite URL — school invites are the product path.
 */
export default async function LegacyAcceptInviteRedirect({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim();
  if (token) {
    redirect(
      `/auth/accept-school-invite?token=${encodeURIComponent(token)}`,
    );
  }
  redirect("/auth/accept-school-invite");
}
