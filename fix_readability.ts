import * as fs from 'fs';
import * as path from 'path';

function fixFlexWrap(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixFlexWrap(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Improve aesthetics: gradients, cards, readability
    // Increase whitespace of the primary dashboard containers
    content = content.replace(/max-w-7xl/g, 'max-w-[85rem]'); // Give extreme desktops more room
    content = content.replace(/text-slate-500/g, 'text-slate-500/90'); // Slight softening
    
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
    count += fixFlexWrap(dir);
  }
}
console.log(`Updated ${count} files with better readability.`);
