type SectionLink = {
  id: string;
  label: string;
};

type PageSectionNavProps = {
  sections: readonly SectionLink[];
  label?: string;
};

/**
 * In-page jump links for long settings/setup surfaces.
 */
export function PageSectionNav({
  sections,
  label = "On this page",
}: PageSectionNavProps) {
  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className="mt-8 border-y border-line/70 bg-paper-elevated/50 py-3"
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-ink-soft underline-offset-2 hover:text-ink hover:underline"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
