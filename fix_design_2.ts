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
  
  // Replace text-slate-400 with text-slate-500 for better contrast on labels and small text
  content = content.replace(/text-slate-400/g, 'text-slate-500');
  content = content.replace(/text-slate-300 pointer-events-none/g, 'text-slate-400 pointer-events-none');
  
  // Reduce absolute borders to extremely light or soft variants, keep colors clean
  content = content.replace(/border-slate-200/g, 'border-slate-200/60');
  // Revert /60/60 if already there
  content = content.replace(/border-slate-200\/60\/60/g, 'border-slate-200/60');

  writeFileSync(file, content);
}

console.log(`Updated contrast and borders tokens globally`);
