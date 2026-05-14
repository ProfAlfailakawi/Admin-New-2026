import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log("Generating solid background icons...");

  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Create a solid base first
  const baseImg = await sharp('./public/logo.png')
    .resize(920, 920, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flatten({ background: '#ffffff' }) // Force solid white
    .extend({
      top: 52, bottom: 52, left: 52, right: 52,
      background: '#ffffff'
    })
    .resize(1024, 1024)
    .toBuffer();

  await sharp(baseImg)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  await sharp(baseImg)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));

  await sharp(baseImg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));

  // Maskable icon (safe area is 80%)
  await sharp('./public/logo.png')
    .resize(700, 700, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flatten({ background: '#E9163D' }) // Give it the theme color background
    .extend({
        top: 162, bottom: 162, left: 162, right: 162,
        background: '#E9163D'
    })
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'maskable-512.png'));

  console.log("Done.");
}

generate();
