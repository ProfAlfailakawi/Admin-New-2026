import * as fs from 'fs';
import * as path from 'path';

function fixRadius(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixRadius(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/rounded-\[4rem\]/g, 'rounded-[2.5rem]');
    content = content.replace(/rounded-\[50px\]/g, 'rounded-[2.5rem]');
    // also limit large rounded corners
    content = content.replace(/rounded-3xl sm:rounded-\[2\.5rem\]/g, 'rounded-3xl');

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
    count += fixRadius(dir);
  }
}
console.log(`Updated ${count} files with responsive radius.`);
