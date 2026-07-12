import * as fs from 'fs';
import * as path from 'path';

function fixButtons(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixButtons(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Refine button sizings
    content = content.replace(/px-8 md:px-12 py-3 md:py-5/g, 'px-6 md:px-8 py-3 md:py-4');
    content = content.replace(/px-6 md:px-10 py-4/g, 'px-5 md:px-6 py-3');
    content = content.replace(/px-5 py-4/g, 'px-5 py-3');
    content = content.replace(/px-4 md:px-8 py-4/g, 'px-5 md:px-6 py-3');

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
    count += fixButtons(dir);
  }
}
console.log(`Updated ${count} files with balanced buttons.`);
