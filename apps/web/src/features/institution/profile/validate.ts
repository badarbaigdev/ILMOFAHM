import { type InstitutionType, isInstitutionType } from "../mode";

export type OrganizationProfileInput = {
  name: string;
  institutionType: InstitutionType;
};

export type OrganizationProfileValidation =
  { ok: true; value: OrganizationProfileInput } | { ok: false; error: string };

export function validateOrganizationProfileInput(input: {
  name: string;
  institutionType: string;
}): OrganizationProfileValidation {
  const name = input.name.trim();
  const institutionType = input.institutionType.trim();

  if (name.length < 2) {
    return {
      ok: false,
      error: "Enter an organization name with at least 2 characters.",
    };
  }

  if (!isInstitutionType(institutionType)) {
    return {
      ok: false,
      error: "Choose school, academy, or both.",
    };
  }

  return {
    ok: true,
    value: { name, institutionType },
  };
}
