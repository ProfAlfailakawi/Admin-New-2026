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
  
  // Replace font-black with font-bold for better readability in Arabic
  content = content.replace(/font-black/g, 'font-bold');

  // Soften shadows: replace shadow-2xl with shadow-xl or shadow-lg
  // The user wants a calmer, elegant design. shadow-2xl is sometimes too aggressive.
  content = content.replace(/shadow-2xl/g, 'shadow-xl');
  content = content.replace(/shadow-3xl/g, 'shadow-2xl');

  // Fix extremely heavy rounded corners
  content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl');
  content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
  content = content.replace(/rounded-\[4rem\]/g, 'rounded-[2rem]');
  content = content.replace(/rounded-\[3rem\]/g, 'rounded-[2rem]');
  content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-2xl');
  content = content.replace(/rounded-\[2\.2rem\]/g, 'rounded-2xl');
  content = content.replace(/rounded-\[2rem\]/g, 'rounded-2xl');

  // Add subtle transitions to any cards or buttons (if needed, but usually handled by global or specific styles)
  // Fix font size overly large texts
  content = content.replace(/text-\[4rem\]/g, 'text-5xl md:text-6xl');
  content = content.replace(/text-\[3rem\]/g, 'text-4xl md:text-5xl');

  writeFileSync(file, content);
}

console.log(`Updated design tokens globally`);
