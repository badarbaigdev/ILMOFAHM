/**
 * Effective branding for display: campus override wins when set, else org.
 */

export type BrandingSource = {
  name: string;
  brandDisplayName: string | null;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
};

export type EffectiveBranding = {
  displayName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  inheritedFromOrganization: boolean;
};

export function resolveEffectiveBranding(
  organization: BrandingSource,
  campus?: Pick<
    BrandingSource,
    "brandDisplayName" | "brandPrimaryColor" | "brandLogoUrl"
  > | null,
): EffectiveBranding {
  const displayName =
    campus?.brandDisplayName ??
    organization.brandDisplayName ??
    organization.name;
  const primaryColor =
    campus?.brandPrimaryColor ?? organization.brandPrimaryColor ?? null;
  const logoUrl = campus?.brandLogoUrl ?? organization.brandLogoUrl ?? null;

  const inheritedFromOrganization = !(
    Boolean(campus?.brandDisplayName) ||
    Boolean(campus?.brandPrimaryColor) ||
    Boolean(campus?.brandLogoUrl)
  );

  return {
    displayName,
    primaryColor,
    logoUrl,
    inheritedFromOrganization,
  };
}
