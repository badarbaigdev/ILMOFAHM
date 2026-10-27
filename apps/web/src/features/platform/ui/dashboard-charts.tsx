type ChartSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

const DEFAULT_COLORS = [
  "#0f766e",
  "#0ea5e9",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#14b8a6",
  "#f97316",
];

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "default" | "warn" | "ok" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-200 bg-amber-50/80"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50/70"
        : tone === "info"
          ? "border-sky-200 bg-sky-50/70"
          : "border-line bg-paper-elevated";

  const inner = (
    <>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`card-interactive block rounded-2xl border p-4 no-underline ${toneClass}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>{inner}</article>
  );
}

export function HorizontalBarChart({
  title,
  slices,
  emptyLabel = "No data yet",
}: {
  title: string;
  slices: ChartSlice[];
  emptyLabel?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <section className="rounded-2xl border border-line bg-paper-elevated p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {total === 0 ? (
        <p className="mt-8 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {slices.map((slice) => {
            const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
            return (
              <li key={slice.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-ink">{slice.label}</span>
                  <span className="tabular-nums text-muted">
                    {slice.value}
                    <span className="ml-1 text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: slice.color,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function DonutChart({
  title,
  slices,
  centerLabel,
  emptyLabel = "No data yet",
}: {
  title: string;
  slices: ChartSlice[];
  centerLabel?: string;
  emptyLabel?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const size = 160;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs =
    total === 0
      ? []
      : slices
          .filter((s) => s.value > 0)
          .map((slice) => {
            const length = (slice.value / total) * circumference;
            const arc = {
              ...slice,
              dasharray: `${length} ${circumference - length}`,
              dashoffset: -offset,
            };
            offset += length;
            return arc;
          });

  return (
    <section className="rounded-2xl border border-line bg-paper-elevated p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {total === 0 ? (
        <p className="mt-8 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="relative mx-auto shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label={title}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e8eef5"
                strokeWidth={stroke}
              />
              {arcs.map((arc) => (
                <circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={stroke}
                  strokeDasharray={arc.dasharray}
                  strokeDashoffset={arc.dashoffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold tabular-nums text-ink">
                {total}
              </p>
              <p className="text-[0.65rem] tracking-wide text-muted uppercase">
                {centerLabel ?? "Total"}
              </p>
            </div>
          </div>
          <ul className="min-w-[10rem] flex-1 space-y-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.id} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate text-ink">
                  {slice.label}
                </span>
                <span className="tabular-nums text-muted">{slice.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function colorForIndex(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]!;
}

export function buildSlices(
  entries: Array<{ id: string; label: string; value: number }>,
): ChartSlice[] {
  return entries.map((entry, index) => ({
    ...entry,
    color: colorForIndex(index),
  }));
}
