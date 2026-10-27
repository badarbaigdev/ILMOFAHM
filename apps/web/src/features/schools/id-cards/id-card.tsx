"use client";

export type SchoolIdCardProps = {
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolContact?: string | null;
  personName: string;
  personPhotoUrl?: string | null;
  roleLabel: "Student" | "Guardian" | "Teacher";
  idLabel: string;
  idValue: string;
  detailLabel: string;
  detailValue: string;
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/**
 * Credit-card sized printable ID. Screen chrome (print button) is hidden in print.
 */
export function SchoolIdCard({
  schoolName,
  schoolLogoUrl,
  schoolContact,
  personName,
  personPhotoUrl,
  roleLabel,
  idLabel,
  idValue,
  detailLabel,
  detailValue,
}: SchoolIdCardProps) {
  return (
    <div className="school-id-card-root">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .school-id-card-root,
          .school-id-card-root * {
            visibility: visible !important;
          }
          .school-id-card-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
          .school-id-card-chrome {
            display: none !important;
          }
          .school-id-card-face {
            box-shadow: none !important;
            border-color: #ccc !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="school-id-card-chrome print:hidden mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          Print
        </button>
        <p className="text-sm text-muted">
          Use your browser print dialog. Landscape is optional for a single card.
        </p>
      </div>

      <article
        className="school-id-card-face print:block mx-auto w-[85.6mm] max-w-full overflow-hidden rounded-2xl border border-line bg-paper-elevated shadow-sm"
        style={{ aspectRatio: "85.6 / 53.98" }}
        aria-label={`${roleLabel} ID card for ${personName}`}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-2.5 border-b border-line bg-[#f4f7f8] px-3 py-2">
            {schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schoolLogoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-contain"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-teal text-[0.65rem] font-bold text-white"
              >
                {initials(schoolName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[0.7rem] font-semibold tracking-wide text-ink uppercase">
                {schoolName}
              </p>
              <p className="text-[0.65rem] text-muted">{roleLabel} identity card</p>
            </div>
          </header>

          <div className="flex flex-1 items-stretch gap-3 px-3 py-2.5">
            <div className="flex shrink-0 items-center">
              {personPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personPhotoUrl}
                  alt=""
                  className="h-[22mm] w-[18mm] rounded-md border border-line object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-[22mm] w-[18mm] items-center justify-center rounded-md border border-line bg-[#dce8e6] text-lg font-semibold text-teal"
                >
                  {initials(personName)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5 self-center">
              <div>
                <p className="text-[0.6rem] tracking-wide text-muted uppercase">
                  Name
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {personName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[0.6rem] tracking-wide text-muted uppercase">
                    {idLabel}
                  </p>
                  <p className="truncate text-xs font-medium text-teal">
                    {idValue}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] tracking-wide text-muted uppercase">
                    {detailLabel}
                  </p>
                  <p className="truncate text-xs text-ink">{detailValue}</p>
                </div>
              </div>
              <p className="inline-flex rounded bg-teal/10 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-teal uppercase">
                {roleLabel}
              </p>
            </div>
          </div>

          {schoolContact ? (
            <footer className="border-t border-line px-3 py-1.5">
              <p className="truncate text-[0.6rem] text-muted">{schoolContact}</p>
            </footer>
          ) : null}
        </div>
      </article>
    </div>
  );
}
