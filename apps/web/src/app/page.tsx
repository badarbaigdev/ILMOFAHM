import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(15,118,110,0.08),transparent)]"
      />

      <p className="mb-5 text-xs font-semibold tracking-[0.22em] text-teal uppercase">
        {brand.institutionalLabel}
      </p>

      <h1 className="font-display text-5xl leading-none tracking-tight text-ink sm:text-7xl">
        {brand.productName}
      </h1>

      <p className="mt-5 max-w-xl font-display text-2xl leading-snug text-ink-soft sm:text-3xl">
        {brand.tagline}
      </p>

      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
        {brand.descriptor}
      </p>

      <p className="mt-12 max-w-xl border-t border-line pt-6 text-sm text-muted">
        Engineering foundation is in progress. This page is a brand-accurate
        placeholder and does not expose live institutional data.
      </p>
    </main>
  );
}
