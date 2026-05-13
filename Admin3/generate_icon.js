import fs from 'fs';
import sharp from 'sharp';

async function generate() {
  try {
    const bg = { r: 255, g: 255, b: 255, alpha: 1 };
    
    await sharp('public/logo.png')
      .flatten({ background: bg })
      .resize(180, 180, { fit: 'contain', background: bg })
      .toFile('public/apple-touch-icon-solid.png');
      
    await sharp('public/logo.png')
      .flatten({ background: bg })
      .resize(192, 192, { fit: 'contain', background: bg })
      .toFile('public/icon-192-solid.png');

    await sharp('public/logo.png')
      .flatten({ background: bg })
      .resize(512, 512, { fit: 'contain', background: bg })
      .toFile('public/icon-512-solid.png');
      
    console.log('Icons generated successfully.');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generate();
