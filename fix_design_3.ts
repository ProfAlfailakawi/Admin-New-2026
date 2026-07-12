import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTSXFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTSXFiles(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = getAllTSXFiles('src');

for (const file of files) {
  let content = readFileSync(file, 'utf8');
  
  // Replace microscopic sizes with min 10px or 11px
  content = content.replace(/text-\[8px\]/g, 'text-[10px]');
  content = content.replace(/text-\[9px\]/g, 'text-[10px]');
  // Often md:text-[10px] comes with text-[9px], we make it md:text-[11px] or text-xs
  content = content.replace(/md:text-\[10px\]/g, 'md:text-[11px]');

  // Make sure to remove empty rounded-tl-none or similar if they break the visual rhythm, but for now typography comes first
  
  writeFileSync(file, content);
}

console.log(`Updated micro text globally`);
