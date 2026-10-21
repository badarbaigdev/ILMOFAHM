export type OrganizationBrandingInput = {
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
};

export type BrandingValidation =
  { ok: true; value: OrganizationBrandingInput } | { ok: false; error: string };

export type CampusBrandingOverrideInput = {
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
};

export type CampusBrandingValidation =
  | { ok: true; value: CampusBrandingOverrideInput }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;
const HTTPS_URL_RE = /^https:\/\/[^\s]+$/i;

function optionalTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateColor(
  color: string | null,
): { ok: true } | { ok: false; error: string } {
  if (color && !HEX_RE.test(color)) {
    return { ok: false, error: "Brand color must be a #RRGGBB hex value." };
  }
  return { ok: true };
}

function validateLogo(
  logo: string | null,
): { ok: true } | { ok: false; error: string } {
  if (logo && !HTTPS_URL_RE.test(logo)) {
    return { ok: false, error: "Logo URL must be an https URL." };
  }
  return { ok: true };
}

export function validateOrganizationBrandingInput(input: {
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  brandDisplayName?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string;
}): BrandingValidation {
  const contactEmail = optionalTrim(input.contactEmail ?? "");
  const contactPhone = optionalTrim(input.contactPhone ?? "");
  const websiteUrl = optionalTrim(input.websiteUrl ?? "");
  const brandDisplayName = optionalTrim(input.brandDisplayName ?? "");
  const brandPrimaryColor = optionalTrim(input.brandPrimaryColor ?? "");
  const brandLogoUrl = optionalTrim(input.brandLogoUrl ?? "");

  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return {
      ok: false,
      error: "Enter a valid contact email, or leave it blank.",
    };
  }
  if (websiteUrl && !HTTP_URL_RE.test(websiteUrl)) {
    return {
      ok: false,
      error: "Website URL must start with http:// or https://.",
    };
  }

  const colorCheck = validateColor(brandPrimaryColor);
  if (!colorCheck.ok) {
    return colorCheck;
  }
  const logoCheck = validateLogo(brandLogoUrl);
  if (!logoCheck.ok) {
    return logoCheck;
  }

  return {
    ok: true,
    value: {
      contactEmail: contactEmail ? contactEmail.toLowerCase() : null,
      contactPhone,
      websiteUrl,
      brandDisplayName,
      brandPrimaryColor: brandPrimaryColor
        ? brandPrimaryColor.toUpperCase()
        : null,
      brandLogoUrl,
    },
  };
}

export function validateCampusBrandingOverrideInput(input: {
  brandDisplayName?: string;
  brandPrimaryColor?: string;
  brandLogoUrl?: string;
}): CampusBrandingValidation {
  const brandDisplayName = optionalTrim(input.brandDisplayName ?? "");
  const brandPrimaryColor = optionalTrim(input.brandPrimaryColor ?? "");
  const brandLogoUrl = optionalTrim(input.brandLogoUrl ?? "");

  const colorCheck = validateColor(brandPrimaryColor);
  if (!colorCheck.ok) {
    return colorCheck;
  }
  const logoCheck = validateLogo(brandLogoUrl);
  if (!logoCheck.ok) {
    return logoCheck;
  }

  return {
    ok: true,
    value: {
      brandDisplayName,
      brandPrimaryColor: brandPrimaryColor
        ? brandPrimaryColor.toUpperCase()
        : null,
      brandLogoUrl,
    },
  };
}
