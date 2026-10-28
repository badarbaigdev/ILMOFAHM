/**
 * School brand mark — real logo when available, otherwise a professional
 * placeholder used in chrome, headers, and printouts.
 */
export function SchoolLogo({
  schoolName,
  logoUrl,
  size = "md",
  className = "",
}: {
  schoolName: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const rounded = size === "lg" ? "rounded-xl" : "rounded-md";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={`${dim} ${rounded} shrink-0 bg-white/10 object-contain ${className}`}
      />
    );
  }

  const initial =
    schoolName
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SC";

  return (
    <span
      aria-hidden
      title={`${schoolName} logo placeholder`}
      className={`relative ${dim} ${rounded} inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-teal to-[#0f5c56] text-white ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className="absolute inset-0 h-full w-full opacity-25"
        aria-hidden
      >
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 24c4-8 20-8 24 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 18l8-6 8 6v8H12z"
          fill="currentColor"
          opacity="0.35"
        />
      </svg>
      <span
        className={
          size === "sm"
            ? "relative text-[0.6rem] font-bold tracking-wide"
            : size === "lg"
              ? "relative text-sm font-bold tracking-wide"
              : "relative text-[0.7rem] font-bold tracking-wide"
        }
      >
        {initial}
      </span>
    </span>
  );
}
