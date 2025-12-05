// Generate 16x16 and 32x32 PNG favicons from public/workpal-icon.png
// Requires: sharp (npm i -D sharp)
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const src = path.join(publicDir, 'workpal-icon.png');
  const out16 = path.join(publicDir, 'workpal-icon-16.png');
  const out32 = path.join(publicDir, 'workpal-icon-32.png');

  if (!fs.existsSync(src)) {
    console.error('Source icon not found:', src);
    process.exit(1);
  }

  // Trim transparent borders and center crop before resizing
  const base = sharp(src).trim();

  await base
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out16);
  console.log('Generated', out16);

  await base
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out32);
  console.log('Generated', out32);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
