import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

type MarketingShellProps = {
  children: React.ReactNode;
};

/**
 * Public marketing chrome: skip link, site nav, footer.
 * Does not depend on Auth or database tables.
 */
export function MarketingShell({ children }: MarketingShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
