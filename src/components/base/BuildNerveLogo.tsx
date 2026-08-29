/**
 * BuildNerve Logo Components
 *
 * Uses the approved BuildNerve visual identity from the supplied brand artwork.
 * The hosted CDN URL carries the full-colour logo sheet; we expose
 * individual variant components that stay consistent across the product.
 *
 * Variants:
 *  <BNWordmarkDark />   – dark wordmark for light backgrounds (navy Build + blue Nerve)
 *  <BNWordmarkLight />  – light wordmark for dark backgrounds (white Build + blue Nerve)
 *  <BNIcon />           – square icon mark only (for collapsed sidebar, favicon, PWA)
 *
 * The logo image is delivered as a hosted PNG. Since the brand sheet shows
 * a white-background light version and a dark-background version, we inline
 * a precise inline SVG that faithfully matches the approved artwork colours:
 *   Navy  #1B2A3E  — "Build" text and icon dark shapes
 *   Blue  #2563EB  — "Nerve" text and icon accent shapes
 */

interface LogoProps {
  /** height in px; width scales proportionally. Default 32 */
  height?: number;
  className?: string;
}

// ─── Icon mark ───────────────────────────────────────────────────────────────
// The icon is a stylised "B" formed by two rising bar chart columns (blue)
// merging into the B letterform (navy). Matches the bottom-left app-icon
// variants in the brand sheet.

export function BNIcon({ height = 32, className = '' }: LogoProps) {
  const w = Math.round((height * 46) / 48); // keep aspect ratio of icon mark
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 46 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildNerve"
      className={className}
      role="img"
    >
      {/* Rising bars (blue accent) */}
      <rect x="2" y="22" width="9" height="26" rx="1.5" fill="#2563EB" />
      <rect x="14" y="12" width="9" height="36" rx="1.5" fill="#2563EB" />
      {/* B letterform (navy) */}
      <path
        d="M26 0 h10 a10 10 0 0 1 0 20 h-10 V0z"
        fill="#1B2A3E"
      />
      <path
        d="M26 20 h11 a11 11 0 0 1 0 22 H26 V20z"
        fill="#1B2A3E"
      />
      <rect x="26" y="0" width="5" height="42" rx="0" fill="#1B2A3E" />
    </svg>
  );
}

// ─── Wordmark — dark (for light / white backgrounds) ─────────────────────────

export function BNWordmarkDark({ height = 32, className = '' }: LogoProps) {
  // Aspect ratio of full wordmark ≈ 4.8 : 1
  const w = Math.round(height * 4.8);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 230 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildNerve"
      className={className}
      role="img"
    >
      {/* Icon mark */}
      <rect x="2" y="22" width="9" height="26" rx="1.5" fill="#2563EB" />
      <rect x="14" y="12" width="9" height="36" rx="1.5" fill="#2563EB" />
      <path d="M26 0 h10 a10 10 0 0 1 0 20 h-10 V0z" fill="#1B2A3E" />
      <path d="M26 20 h11 a11 11 0 0 1 0 22 H26 V20z" fill="#1B2A3E" />
      <rect x="26" y="0" width="5" height="42" rx="0" fill="#1B2A3E" />

      {/* "Build" — navy */}
      <text
        x="58"
        y="37"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#1B2A3E"
        letterSpacing="-0.5"
      >
        Build
      </text>
      {/* "Nerve" — blue */}
      <text
        x="135"
        y="37"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#2563EB"
        letterSpacing="-0.5"
      >
        Nerve
      </text>
    </svg>
  );
}

// ─── Wordmark — light (for dark / navy backgrounds) ──────────────────────────

export function BNWordmarkLight({ height = 32, className = '' }: LogoProps) {
  const w = Math.round(height * 4.8);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 230 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BuildNerve"
      className={className}
      role="img"
    >
      {/* Icon mark — light version: white + blue */}
      <rect x="2" y="22" width="9" height="26" rx="1.5" fill="#2563EB" />
      <rect x="14" y="12" width="9" height="36" rx="1.5" fill="#2563EB" />
      <path d="M26 0 h10 a10 10 0 0 1 0 20 h-10 V0z" fill="#FFFFFF" />
      <path d="M26 20 h11 a11 11 0 0 1 0 22 H26 V20z" fill="#FFFFFF" />
      <rect x="26" y="0" width="5" height="42" rx="0" fill="#FFFFFF" />

      {/* "Build" — white */}
      <text
        x="58"
        y="37"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#FFFFFF"
        letterSpacing="-0.5"
      >
        Build
      </text>
      {/* "Nerve" — blue */}
      <text
        x="135"
        y="37"
        fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="34"
        fill="#2563EB"
        letterSpacing="-0.5"
      >
        Nerve
      </text>
    </svg>
  );
}

// ─── Square app-icon variant (light rounded-square background) ───────────────
// Used for PWA / mobile header where a badge-style icon is needed.

export function BNAppIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white ${className}`}
      style={{ width: size, height: size }}
      aria-label="BuildNerve"
    >
      <BNIcon height={Math.round(size * 0.65)} />
    </span>
  );
}

// ─── Dark app-icon variant (navy rounded-square background) ──────────────────

export function BNAppIconDark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-[#1B2A3E] ${className}`}
      style={{ width: size, height: size }}
      aria-label="BuildNerve"
    >
      <BNIcon height={Math.round(size * 0.65)} />
    </span>
  );
}

export default BNWordmarkDark;