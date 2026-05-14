import * as fs from 'fs';
import * as path from 'path';

function fixContrast(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixContrast(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Improve contrast for secondary texts
    content = content.replace(/text-slate-400/g, 'text-slate-500');
    // Ensure titles are crisp
    content = content.replace(/text-slate-800/g, 'text-slate-900');
    // Subtly soften backgrounds from pure white to a very light shade occasionally? 
    // No, pure white is fine, but borders can be softer
    content = content.replace(/border-slate-100/g, 'border-slate-200/60');
    content = content.replace(/bg-slate-50 border border-slate-200/g, 'bg-slate-50/50 border border-slate-200/60');

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
    count += fixContrast(dir);
  }
}
console.log(`Updated ${count} files, improved contrast.`);
