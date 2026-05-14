import * as fs from 'fs';
import * as path from 'path';

function fixTypography(directory) {
  const files = fs.readdirSync(directory);
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      processed += fixTypography(filePath);
      continue;
    }
    
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Soften font weights on smaller text (stop shouting in UI)
    content = content.replace(/font-black text-xs/g, 'font-bold text-xs');
    content = content.replace(/font-black text-sm/g, 'font-bold text-sm');
    content = content.replace(/font-black text-base/g, 'font-bold text-base');
    content = content.replace(/font-black text-\[1[0-4]px\]/g, match => match.replace('font-black', 'font-bold'));
    
    // Convert generic font-black strings (often in buttons) to font-bold
    content = content.replace(/className="[^"]*font-black[^"]*"/g, (match) => {
        // If it contains a large text size, keep it black
        if (match.includes('text-2xl') || match.includes('text-3xl') || match.includes('text-4xl') || match.includes('text-5xl') || match.includes('text-xl') || match.includes('text-lg')) {
            return match;
        }
        // Otherwise soften it
        return match.replace(/font-black/g, 'font-bold');
    });

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
    count += fixTypography(dir);
  }
}
console.log(`Updated ${count} files, softened typography.`);
