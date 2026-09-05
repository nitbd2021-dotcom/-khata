import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Standard SVG for normal icons
const svgNormal = fs.readFileSync(path.join(publicDir, 'icon.svg'));

// Maskable SVG with 100% full-bleed rectangular background (no rx) and artwork scaled within safe-zone
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="plusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#064e3b" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Full-bleed background for maskable shape clipping -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Centered artwork scaled down to 78% for Android maskable safe-zone -->
  <g transform="translate(56, 56) scale(0.78)">
    <g filter="url(#shadow)">
      <rect x="110" y="100" width="280" height="312" rx="24" fill="#022c22" opacity="0.25" />
      <rect x="118" y="96" width="276" height="316" rx="28" fill="url(#bookGrad)" />
      <path d="M 118 124 C 118 108.536 130.536 96 146 96 L 168 96 L 168 412 L 146 412 C 130.536 412 118 399.464 118 384 Z" fill="url(#accentGrad)" />

      <circle cx="143" cy="145" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="143" cy="195" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="143" cy="255" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="143" cy="315" r="4" fill="#ffffff" opacity="0.8" />
      <circle cx="143" cy="365" r="4" fill="#ffffff" opacity="0.8" />

      <rect x="195" y="150" width="165" height="12" rx="6" fill="#cbd5e1" />
      <rect x="195" y="185" width="135" height="12" rx="6" fill="#e2e8f0" />
      <rect x="195" y="220" width="150" height="12" rx="6" fill="#e2e8f0" />
      <rect x="195" y="255" width="120" height="12" rx="6" fill="#e2e8f0" />
      <rect x="195" y="290" width="140" height="12" rx="6" fill="#e2e8f0" />

      <circle cx="215" cy="345" r="18" fill="#10b981" />
      <path d="M 207 345 L 213 351 L 224 339" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 320 96 L 350 96 L 350 165 L 335 152 L 320 165 Z" fill="#ef4444" />
    </g>

    <g filter="url(#shadow)">
      <circle cx="375" cy="355" r="58" fill="url(#plusGrad)" stroke="#ffffff" stroke-width="8" />
      <rect x="362" y="325" width="26" height="60" rx="6" fill="#ffffff" />
      <rect x="345" y="342" width="60" height="26" rx="6" fill="#ffffff" />
    </g>
  </g>
</svg>`;

async function generate() {
  console.log('Generating PWA icons...');

  // 192x192 PNG
  await sharp(svgNormal)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 512x512 PNG
  await sharp(svgNormal)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 180x180 Apple Touch Icon
  await sharp(svgNormal)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 64x64 favicon.png
  await sharp(svgNormal)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Created favicon.png');

  // 512x512 Maskable PNG
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
