import { redirect } from "next/navigation";

/**
 * Legacy "create organization" — new tenants come from school applications.
 */
export default function PlatformCreateOrganizationRedirectPage() {
  redirect("/platform/requests");
}
