// Simple script to generate placeholder icons
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="8"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.3}px" font-weight="bold">
    SS
  </text>
</svg>`;
};

// Icon sizes needed
const sizes = [72, 96, 128, 144, 192, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated ${filename}`);
});

// Also create special icons
const specialIcons = {
  'upload.svg': createSVGIcon(192),
  'share.svg': createSVGIcon(192)
};

Object.entries(specialIcons).forEach(([name, svg]) => {
  const filename = path.join(iconsDir, name);
  fs.writeFileSync(filename, svg);
  console.log(`Generated ${filename}`);
});

// Create a basic favicon.svg
const favicon = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#2563eb" rx="4"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="14px" font-weight="bold">
    S
  </text>
</svg>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), favicon);
console.log('Generated favicon.svg');

console.log('\nIcon generation complete!');