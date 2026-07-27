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
  
  content = content.replace(/\bw-screen\b/g, 'w-full');
  content = content.replace(/\bw-\[100vw\]\b/g, 'w-full');
  
  // Soften some buttons (active:scale-95 is great, let's keep it).
  
  // Fix border opacities on gradients.
  content = content.replace(/border-white\/20/g, 'border-white/10');

  writeFileSync(file, content);
}

console.log(`Updated screen width globals`);
