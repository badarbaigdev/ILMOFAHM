import { SubTabs } from "@/components/ui/sub-tabs";

type SectionLink = {
  id: string;
  label: string;
};

type PageSectionNavProps = {
  sections: readonly SectionLink[];
  label?: string;
  activeId?: string;
  /** Base path/query used to build tab hrefs. Defaults to hash links. */
  hrefFor?: (sectionId: string) => string;
  variant?: "underline" | "pill";
};

/**
 * In-page section subtabs for settings/setup surfaces.
 */
export function PageSectionNav({
  sections,
  label = "On this page",
  activeId,
  hrefFor,
  variant = "pill",
}: PageSectionNavProps) {
  if (sections.length === 0) return null;

  const active = activeId ?? sections[0]?.id ?? "";

  return (
    <SubTabs
      label={label}
      activeId={active}
      variant={variant}
      items={sections.map((section) => ({
        id: section.id,
        label: section.label,
        href: hrefFor ? hrefFor(section.id) : `#${section.id}`,
      }))}
    />
  );
}
