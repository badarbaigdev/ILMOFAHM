import { redirect } from "next/navigation";

/**
 * Legacy organization console — school onboarding is the active product path.
 * Keep the route so old bookmarks do not 404; send operators to schools.
 */
export default function PlatformOrganizationsRedirectPage() {
  redirect("/platform/schools");
}
