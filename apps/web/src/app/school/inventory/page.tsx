import { redirect } from "next/navigation";

import {
  authorizeSchool,
  canSchool,
  isSchoolAuthorizationError,
} from "@/features/schools/authorization";
import { schoolBrandLogoUrl, schoolBrandName } from "@/features/schools/branding";
import { loadSchoolContext } from "@/features/schools/context";
import { SchoolInventoryPanel } from "@/features/schools/inventory/inventory-panel";
import {
  listSchoolInventoryItems,
  listSchoolInventoryMovements,
} from "@/features/schools/inventory/queries";
import { getRequestSchoolSlug } from "@/lib/tenancy/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ school?: string }>;
};

export default async function SchoolInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSchoolId = params.school?.trim() ?? "";
  const hostSchoolSlug = await getRequestSchoolSlug();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = requestedSchoolId
      ? `/school/inventory?school=${encodeURIComponent(requestedSchoolId)}`
      : "/school/inventory";
    redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  let loaded;
  try {
    loaded = await loadSchoolContext(
      supabase,
      user.id,
      requestedSchoolId,
      hostSchoolSlug ?? undefined,
    );
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load inventory.
        </p>
      </main>
    );
  }

  if (!loaded.active) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
        <p className="mt-4 text-sm text-muted">
          You need an active school membership to view inventory.
        </p>
      </main>
    );
  }

  const { active } = loaded;

  try {
    await authorizeSchool(
      supabase,
      user.id,
      active.school.id,
      "inventory.read",
    );
  } catch (error) {
    if (isSchoolAuthorizationError(error)) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
        >
          <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
          <p role="alert" className="mt-4 text-sm text-red-700">
            You do not have permission to view inventory for this school.
          </p>
        </main>
      );
    }
    throw error;
  }

  let items;
  let movements;
  try {
    [items, movements] = await Promise.all([
      listSchoolInventoryItems(supabase, active.school.id),
      listSchoolInventoryMovements(supabase, active.school.id),
    ]);
  } catch {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
      >
        <h1 className="text-2xl font-semibold text-ink">Inventory</h1>
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load inventory data. Apply the latest database migrations
          and try again.
        </p>
      </main>
    );
  }

  const canManage = await canSchool(
    supabase,
    user.id,
    active.school.id,
    "inventory.manage",
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full max-w-none px-3 py-6 outline-none sm:px-4 lg:px-5"
    >
      <SchoolInventoryPanel
        schoolId={active.school.id}
        schoolName={schoolBrandName(active.school)}
        schoolLogoUrl={schoolBrandLogoUrl(active.school)}
        items={items}
        movements={movements}
        canManage={canManage}
      />
    </main>
  );
}
