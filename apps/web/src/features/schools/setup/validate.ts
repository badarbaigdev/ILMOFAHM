import {
  isInstitutionType,
  type InstitutionType,
} from "../../institution/mode";
import { validateOrganizationProfileInput } from "../../institution/profile/validate";

export type SchoolProfileInput = {
  name: string;
  institutionType: InstitutionType;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  countryCode: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateSchoolProfileInput(input: {
  name: string;
  institutionType: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  region?: string;
  countryCode?: string;
}): { ok: true; value: SchoolProfileInput } | { ok: false; error: string } {
  const base = validateOrganizationProfileInput({
    name: input.name,
    institutionType: input.institutionType,
  });
  if (!base.ok) {
    return {
      ok: false,
      error: base.error.replace("organization", "school"),
    };
  }

  const email = optionalTrim(input.email ?? "");
  if (email && !EMAIL_RE.test(email)) {
    return {
      ok: false,
      error: "Enter a valid school email, or leave it blank.",
    };
  }

  const countryCode = (input.countryCode ?? "PK").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code." };
  }

  if (!isInstitutionType(base.value.institutionType)) {
    return { ok: false, error: "Choose school, academy, or both." };
  }

  return {
    ok: true,
    value: {
      name: base.value.name,
      institutionType: base.value.institutionType,
      email: email ? email.toLowerCase() : null,
      phone: optionalTrim(input.phone ?? ""),
      addressLine1: optionalTrim(input.addressLine1 ?? ""),
      city: optionalTrim(input.city ?? ""),
      region: optionalTrim(input.region ?? ""),
      countryCode,
    },
  };
}
