// One-shot favicon exporter — renders public/favicon.svg to every PNG size
// the app references, and writes them into /public and /public/icons.
//
// Usage:
//   npm install --no-save sharp
//   node scripts/export-favicon.mjs
//
// (The --no-save flag keeps package.json untouched.)

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Three variants of the mark:
//  - rounded : matches favicon.svg (navy rounded square) — for tab favicons
//  - square  : full-bleed navy square (no rounding) — for iOS/PWA "any"
//  - maskable: full-bleed + content scaled into the 80% safe zone
const NAVY = '#1B2A3E';
const BLUE = '#2563EB';
const WHITE = '#FFFFFF';

const bars = [
  `<rect x="3" y="22" width="8" height="23" rx="1.5" fill="${BLUE}"/>`,
  `<rect x="14" y="14" width="8" height="31" rx="1.5" fill="${BLUE}"/>`,
  `<path d="M25 4 h9 a9 9 0 0 1 0 18 h-9 V4z" fill="${WHITE}"/>`,
  `<path d="M25 22 h10 a10 10 0 0 1 0 20 H25 V22z" fill="${WHITE}"/>`,
  `<rect x="25" y="4" width="5" height="38" fill="${WHITE}"/>`,
].join('\n    ');

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="${NAVY}"/>
  ${bars}
</svg>`;

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="${NAVY}"/>
  ${bars}
</svg>`;

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="${NAVY}"/>
  <g transform="translate(4.8 4.8) scale(0.8)">
    ${bars}
  </g>
</svg>`;

// target: [output path relative to repo root, pixel size, variant]
const targets = [
  ['public/favicon-16.png', 16, rounded],
  ['public/favicon-32.png', 32, rounded],
  ['public/favicon-48.png', 48, rounded],
  ['public/apple-touch-icon.png', 180, square],
  ['public/icons/icon-180.png', 180, square],
  ['public/icons/icon-192.png', 192, square],
  ['public/icons/icon-512.png', 512, square],
  ['public/icons/icon-192-maskable.png', 192, maskable],
  ['public/icons/icon-512-maskable.png', 512, maskable],
];

for (const [relPath, size, source] of targets) {
  const outPath = join(root, relPath);
  await mkdir(dirname(outPath), { recursive: true });

  const svgWithSize = source.replace(
    '<svg ',
    `<svg width="${size}" height="${size}" `,
  );

  await sharp(Buffer.from(svgWithSize)).png().toFile(outPath);
  console.log(`  ✓ ${relPath} (${size}x${size})`);
}

console.log('\nDone — all PNG favicons written.');