import * as fs from 'fs';
import * as path from 'path';

function softenShadows(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += softenShadows(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Use a unified, soft, floating shadow for main cards instead of aggressive deep shadows
    content = content.replace(/shadow-xl/g, 'shadow-[0_4px_20px_rgb(0,0,0,0.05)]');
    content = content.replace(/shadow-\[0_20px_50px_\-12px_rgba\(.*\)\]/g, 'shadow-[0_4px_20px_rgb(0,0,0,0.05)]');
    content = content.replace(/shadow-\[0_50px_100px_\-20px_rgba\(.*\)\]/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.08)]');
    content = content.replace(/shadow-lg/g, 'shadow-[0_2px_10px_rgb(0,0,0,0.04)]');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      processed++;
    }
  }
  return processed;
}

const appDirs = [path.join(process.cwd(), 'src'), path.join(process.cwd(), 'admin/src')];
let count = 0;
for (const dir of appDirs) {
  if (fs.existsSync(dir)) {
    count += softenShadows(dir);
  }
}
console.log(`Updated ${count} files with soft shadows.`);
