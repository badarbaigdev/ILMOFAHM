"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearContextCookies,
  writeContextCookies,
} from "@/features/platform/context/cookies";
import { loadWorkspaceContext } from "@/features/platform/context/load";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ContextActionState = {
  error: string | null;
};

/**
 * Switch organization/campus context after server-side membership validation.
 * Invalid IDs are ignored (fall back) — they must not reveal other tenants.
 * Cookies are preference only and never prove permission.
 */
export async function switchWorkspaceContextAction(
  _prev: ContextActionState,
  formData: FormData,
): Promise<ContextActionState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const campusId = String(formData.get("campus_id") ?? "").trim() || null;
  const returnTo = String(formData.get("return_to") ?? "/app").trim() || "/app";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/sign-in?next=/app");
  }

  let context;
  try {
    context = await loadWorkspaceContext(supabase, user.id, {
      organizationId: organizationId || null,
      campusId,
    });
  } catch {
    return { error: "Could not update workspace context." };
  }

  if (!context) {
    redirect("/app/onboarding");
  }

  await writeContextCookies({
    organizationId: context.organization.id,
    campusId: context.campus?.id ?? null,
  });

  revalidatePath("/app", "layout");

  const safeReturn =
    returnTo.startsWith("/app") && !returnTo.startsWith("//")
      ? returnTo.split("?")[0]
      : "/app";

  redirect(
    `${safeReturn}?organization=${context.organization.id}${
      context.campus ? `&campus=${context.campus.id}` : ""
    }`,
  );
}

export async function clearWorkspaceContextAction(): Promise<void> {
  await clearContextCookies();
  revalidatePath("/app", "layout");
}
