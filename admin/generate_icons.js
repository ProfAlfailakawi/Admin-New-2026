import sharp from 'sharp';

async function generate() {
  console.log("Generating icons from logo.png...");
  
  // High res 1024x1024 for apple touch icon
  // the source is 789x973, let's fit it inside 920x920 inside 1024x1024 with a white background.
  await sharp('./public/logo.png')
    .resize(920, 920, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background
    .extend({
      top: 52, bottom: 52, left: 52, right: 52,
      background: { r: 255, g: 255, b: 255 }
    })
    .resize(1024, 1024)
    .png()
    .toFile('./public/apple-touch-icon-v11.png');

  // iOS 180x180
  await sharp('./public/apple-touch-icon-v11.png')
    .resize(180, 180)
    .png()
    .toFile('./public/apple-touch-icon-180-v11.png');

  // Web manifest items
  await sharp('./public/apple-touch-icon-v11.png')
    .resize(192, 192)
    .png()
    .toFile('./public/icon-192-v11.png');

  await sharp('./public/apple-touch-icon-v11.png')
    .resize(512, 512)
    .png()
    .toFile('./public/icon-512-v11.png');

  console.log("Done.");
}

generate();

