import { isInstitutionType } from "../../institution/mode";
import {
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from "../onboarding/slug";

export type PlatformCreateOrganizationInput = {
  name: string;
  institutionType: "school" | "academy" | "both";
  slug: string | null;
  campusName: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string | null;
};

export type ValidateResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

export function validatePlatformCreateOrganizationInput(raw: {
  name: string;
  institutionType: string;
  slug: string;
  campusName: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
}): ValidateResult<PlatformCreateOrganizationInput> {
  const name = raw.name.trim();
  if (name.length < 2) {
    return {
      ok: false,
      error: "Organization name must be at least 2 characters.",
    };
  }
  if (name.length > 120) {
    return {
      ok: false,
      error: "Organization name must be 120 characters or fewer.",
    };
  }

  if (!isInstitutionType(raw.institutionType.trim())) {
    return { ok: false, error: "Select a valid institution type." };
  }

  const slugRaw = raw.slug.trim();
  let slug: string | null = null;
  if (slugRaw) {
    if (!isValidOrganizationSlug(slugRaw)) {
      return {
        ok: false,
        error: "Slug must be lowercase letters, numbers, and hyphens.",
      };
    }
    slug = slugRaw;
  } else {
    const derived = slugifyOrganizationName(name);
    slug = derived || null;
  }

  const campusName = raw.campusName.trim() || "Main campus";
  if (campusName.length > 120) {
    return { ok: false, error: "Campus name is too long." };
  }

  const adminEmail = raw.adminEmail.trim().toLowerCase();
  if (!adminEmail || !adminEmail.includes("@")) {
    return { ok: false, error: "Enter a valid admin email." };
  }

  const adminFullName = raw.adminFullName.trim();
  if (adminFullName.length > 120) {
    return { ok: false, error: "Admin name is too long." };
  }

  const passwordRaw = raw.adminPassword;
  let adminPassword: string | null = null;
  if (passwordRaw.length > 0) {
    if (passwordRaw.length < 8) {
      return {
        ok: false,
        error: "Admin password must be at least 8 characters.",
      };
    }
    adminPassword = passwordRaw;
  }

  return {
    ok: true,
    value: {
      name,
      institutionType: raw.institutionType.trim() as
        "school" | "academy" | "both",
      slug,
      campusName,
      adminEmail,
      adminFullName,
      adminPassword,
    },
  };
}
