type PageIntroProps = {
  eyebrow?: string;
  heading: string;
  lead: string;
  notice?: string;
};

export function PageIntro({ eyebrow, heading, lead, notice }: PageIntroProps) {
  return (
    <header className="mx-auto w-full max-w-3xl">
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-teal uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
        {heading}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
        {lead}
      </p>
      {notice ? (
        <p
          className="mt-4 rounded-md border border-line bg-paper-elevated/70 px-4 py-3 text-sm text-ink-soft"
          role="note"
        >
          {notice}
        </p>
      ) : null}
    </header>
  );
}
