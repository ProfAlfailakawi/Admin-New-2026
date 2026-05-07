import sharp from 'sharp';

async function generate() {
  console.log("Generating solid background icons...");

  await sharp('./public/logo.png')
    .resize(920, 920, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flatten({ background: '#ffffff' }) // Force solid white
    .extend({
      top: 52, bottom: 52, left: 52, right: 52,
      background: '#ffffff' // Force solid white
    })
    .resize(1024, 1024)
    .png()
    .toFile('./public/apple-touch-icon-v12.png');

  await sharp('./public/apple-touch-icon-v12.png')
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon-180-v12.png');

  await sharp('./public/apple-touch-icon-v12.png')
    .resize(192, 192)
    .png()
    .toFile('./public/icon-192-v12.png');

  await sharp('./public/apple-touch-icon-v12.png')
    .resize(512, 512)
    .png()
    .toFile('./public/icon-512-v12.png');

  console.log("Done.");
}

generate();
