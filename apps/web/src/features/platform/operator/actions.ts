"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { authorizePlatform } from "@/features/platform/operator/authorize-platform";
import { validatePlatformCreateOrganizationInput } from "@/features/platform/operator/validate";
import { isAuthorizationError } from "@/features/platform/authorization";
import { createServiceSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PlatformProvisionActionState = {
  error: string | null;
  success: string | null;
  /** One-time credentials when a new admin user was created. */
  createdAdmin?: {
    email: string;
    password: string;
    organizationId: string;
    organizationName: string;
  } | null;
};

function generatePassword(): string {
  return `Ilm-${randomBytes(9).toString("base64url")}`;
}

async function requireSignedInOperator() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/auth/sign-in?next=/platform");
  }
  return { supabase, user };
}

/**
 * Resolves an Auth user by email, creating one when needed (service role).
 * Ensures a profiles row exists before membership insert.
 */
async function resolveOrCreateOwnerUser(input: {
  email: string;
  fullName: string;
  password: string | null;
}): Promise<
  | { ok: true; userId: string; created: boolean; password: string | null }
  | { ok: false; error: string }
> {
  const admin = createServiceSupabaseClient();

  async function findUserIdByEmail(email: string): Promise<string | null> {
    let page = 1;
    for (;;) {
      const listed = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listed.error) {
        return null;
      }
      const users = listed.data.users ?? [];
      const match = users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        return match.id;
      }
      if (users.length < 200) {
        return null;
      }
      page += 1;
      if (page > 20) {
        return null;
      }
    }
  }

  const existingId = await findUserIdByEmail(input.email);
  if (existingId) {
    await admin.from("profiles").upsert(
      {
        id: existingId,
        full_name: input.fullName || null,
      },
      { onConflict: "id" },
    );
    return {
      ok: true,
      userId: existingId,
      created: false,
      password: null,
    };
  }

  const password = input.password ?? generatePassword();
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName || undefined,
    },
  });

  if (created.error || !created.data.user) {
    const raced = await findUserIdByEmail(input.email);
    if (raced) {
      await admin
        .from("profiles")
        .upsert(
          { id: raced, full_name: input.fullName || null },
          { onConflict: "id" },
        );
      return { ok: true, userId: raced, created: false, password: null };
    }
    return {
      ok: false,
      error: "Could not create the organization admin account.",
    };
  }

  const userId = created.data.user.id;
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: input.fullName || null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return {
      ok: false,
      error: "Admin account was created but profile setup failed.",
    };
  }

  return { ok: true, userId, created: true, password };
}

export async function platformCreateOrganizationAction(
  _prev: PlatformProvisionActionState,
  formData: FormData,
): Promise<PlatformProvisionActionState> {
  const validated = validatePlatformCreateOrganizationInput({
    name: String(formData.get("name") ?? ""),
    institutionType: String(formData.get("institution_type") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    campusName: String(formData.get("campus_name") ?? ""),
    adminEmail: String(formData.get("admin_email") ?? ""),
    adminFullName: String(formData.get("admin_full_name") ?? ""),
    adminPassword: String(formData.get("admin_password") ?? ""),
  });

  if (!validated.ok) {
    return { error: validated.error, success: null, createdAdmin: null };
  }

  const { supabase, user } = await requireSignedInOperator();

  try {
    await authorizePlatform("platform.organizations.manage", supabase, {
      userId: user.id,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return { error: error.message, success: null, createdAdmin: null };
    }
    throw error;
  }

  const owner = await resolveOrCreateOwnerUser({
    email: validated.value.adminEmail,
    fullName: validated.value.adminFullName,
    password: validated.value.adminPassword,
  });

  if (!owner.ok) {
    return { error: owner.error, success: null, createdAdmin: null };
  }

  const { data, error } = await supabase.rpc("platform_create_organization", {
    p_name: validated.value.name,
    p_institution_type: validated.value.institutionType,
    p_owner_user_id: owner.userId,
    p_slug: validated.value.slug,
    p_campus_name: validated.value.campusName,
  });

  if (error) {
    if (error.message?.includes("Not authorized")) {
      return {
        error: "You do not have platform operator access.",
        success: null,
        createdAdmin: null,
      };
    }
    if (error.code === "23505" || error.message?.includes("slug")) {
      return {
        error: "That organization slug is already in use.",
        success: null,
        createdAdmin: null,
      };
    }
    return {
      error: error.message || "Could not create the organization.",
      success: null,
      createdAdmin: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const organizationId = row?.organization_id as string | undefined;
  const organizationName =
    (row?.name as string | undefined) ?? validated.value.name;

  revalidatePath("/platform");
  revalidatePath("/platform/organizations");

  if (owner.created && owner.password) {
    return {
      error: null,
      success: `Organization “${organizationName}” created. Share the admin credentials once, then ask them to sign in at /auth/sign-in.`,
      createdAdmin: {
        email: validated.value.adminEmail,
        password: owner.password,
        organizationId: organizationId ?? "",
        organizationName,
      },
    };
  }

  return {
    error: null,
    success: `Organization “${organizationName}” created and linked to existing admin ${validated.value.adminEmail}.`,
    createdAdmin: null,
  };
}
