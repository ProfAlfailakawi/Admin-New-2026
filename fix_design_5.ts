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

  // Extremely intense shadows -> elegant, softer shadows
  content = content.replace(/shadow-\[0_50px_100px_-20px_rgba\(0,0,0,0\.8\)\]/g, 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]');
  content = content.replace(/shadow-\[0_50px_100px_-20px_rgba\(0,0,0,0\.5\)\]/g, 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]');
  content = content.replace(/shadow-\[0_20px_50px_-12px_rgba\(0,0,0,0\.05\)\]/g, 'shadow-[0_15px_40px_-10px_rgba(0,0,0,0.03)]');
  
  // Make large border radii more regular
  content = content.replace(/md:rounded-\[40px\]/g, 'md:rounded-3xl');
  content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl');
  content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');

  // Fix borders from being too intense
  content = content.replace(/border-slate-800\/50/g, 'border-slate-800/20');
  content = content.replace(/border-slate-700\/50/g, 'border-slate-700/20');

  writeFileSync(file, content);
}

console.log(`Updated aesthetic shadow tokens globally`);
