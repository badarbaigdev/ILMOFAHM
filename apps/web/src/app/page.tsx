import { brand } from "@/lib/brand";
import { getHealthPayload } from "@/lib/health";

export default function HomePage() {
  const health = getHealthPayload();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 outline-none sm:px-10"
    >
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

      <section
        aria-labelledby="foundation-status-heading"
        className="mt-12 max-w-xl border-t border-line pt-6"
      >
        <h2
          id="foundation-status-heading"
          className="text-sm font-semibold tracking-wide text-ink uppercase"
        >
          Foundation status
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Public landing shell and health check are available. Authentication,
          tenancy, and school workflows are not implemented on this page.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium">Web service:</span> {health.status}
          <span aria-hidden="true"> · </span>
          <span className="text-muted">{health.service}</span>
        </p>
      </section>
    </main>
  );
}
